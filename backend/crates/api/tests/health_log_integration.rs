//! Integration tests for the health-log endpoint.
//!
//! Each test spins up a fresh Postgres container via testcontainers, runs the
//! SQLx migrations, then exercises the HTTP router using `tower::ServiceExt`
//! (no real network socket needed).

use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use idea_pop_api::router;
use serde_json::{json, Value};
use sqlx::PgPool;
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;

async fn start_postgres() -> (PgPool, ContainerAsync<Postgres>) {
    let pg = Postgres::default()
        .start()
        .await
        .expect("start postgres container");
    let port = pg
        .get_host_port_ipv4(5432)
        .await
        .expect("get postgres port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres");
    let pool = PgPool::connect(&url)
        .await
        .expect("connect to test postgres");
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("run migrations");
    (pool, pg)
}

#[tokio::test]
async fn health_endpoint_returns_ok() {
    let (pool, _pg) = start_postgres().await;
    let app = router(pool);

    let res = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let v: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(v["status"], "ok");
}

#[tokio::test]
async fn create_and_list_health_log_roundtrip() {
    let (pool, _pg) = start_postgres().await;

    let res = router(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/health-log")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"message": "phase-1 pipeline validated"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let created: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(created["message"], "phase-1 pipeline validated");
    assert!(created["id"].is_string());

    let res = router(pool)
        .oneshot(
            Request::builder()
                .uri("/api/health-log")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let list: Vec<Value> = serde_json::from_slice(&body).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["message"], "phase-1 pipeline validated");
}

#[tokio::test]
async fn create_health_log_blank_message_returns_422() {
    let (pool, _pg) = start_postgres().await;

    let res = router(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/health-log")
                .header("content-type", "application/json")
                .body(Body::from(json!({"message": "   "}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    let problem: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(problem["status"], 422);
}
