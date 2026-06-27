/**
 * Idea Pop API — TypeScript types
 * Auto-generated from openapi.json by openapi-typescript v7.
 * Run `npm run generate` in packages/api-types to refresh from the live server.
 *
 * DO NOT EDIT MANUALLY.
 */

export interface paths {
  "/api/auth/register": {
    post: operations["authRegister"];
  };
  "/api/auth/login": {
    post: operations["authLogin"];
  };
  "/api/auth/refresh": {
    post: operations["authRefresh"];
  };
  "/api/auth/logout": {
    post: operations["authLogout"];
  };
  "/api/auth/verify-email": {
    post: operations["authVerifyEmail"];
  };
  "/api/children": {
    post: operations["createChild"];
  };
  "/api/children/{id}": {
    get: operations["getChild"];
  };
  "/api/consent/request": {
    post: {
      responses: {
        204: { content: never };
      };
    };
  };
  "/api/consent/verify": {
    post: {
      requestBody: {
        content: {
          "application/json": { token: string };
        };
      };
      responses: {
        200: { content: never };
      };
    };
  };
  "/api/classes": {
    post: operations["createClass"];
  };
  "/api/children/{id}/class": {
    post: {
      parameters: {
        path: { id: string };
      };
      responses: {
        200: { content: never };
      };
    };
  };
  "/api/explore": {
    get: {
      responses: {
        200: { content: { "application/json": unknown[] } };
      };
    };
  };
  "/api/explore/{id}": {
    get: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/library": {
    get: {
      responses: {
        200: { content: { "application/json": unknown[] } };
      };
    };
  };
  "/api/library/courses/{id}": {
    get: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/challenges": {
    get: {
      responses: {
        200: { content: { "application/json": unknown[] } };
      };
    };
  };
  "/api/challenges/{id}": {
    get: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/challenges/{id}/attempt": {
    post: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/challenges/{id}/attempts": {
    get: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown[] } };
      };
    };
  };
  "/api/progress/summary": {
    get: operations["getProgressSummary"];
  };
  "/api/progress/xp": {
    get: operations["getProgressXp"];
  };
  "/api/progress/badges": {
    get: operations["getProgressBadges"];
  };
  "/api/projects": {
    get: {
      responses: {
        200: { content: { "application/json": unknown[] } };
      };
    };
    post: {
      responses: {
        201: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/projects/{id}": {
    get: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/projects/{id}/visibility": {
    patch: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/ideas-wall": {
    get: {
      responses: {
        200: { content: { "application/json": unknown[] } };
      };
    };
  };
  "/api/ideas-wall/{id}/react": {
    post: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { "application/json": unknown } };
      };
    };
  };
  "/api/health-log": {
    get: {
      responses: {
        200: { content: { "application/json": unknown[] } };
      };
    };
    post: {
      responses: {
        201: { content: { "application/json": unknown } };
      };
    };
  };
  "/billing/checkout": {
    post: operations["billingCheckout"];
  };
  "/billing/portal": {
    post: operations["billingPortal"];
  };
  "/billing/subscription": {
    get: operations["getSubscription"];
  };
  "/billing/premium-check": {
    get: operations["getPremiumCheck"];
  };
  "/webhooks/stripe": {
    post: {
      responses: {
        200: { content: never };
      };
    };
  };
}

export interface components {
  schemas: {
    AuthLoginRequest: {
      email: string;
      password: string;
    };
    AuthLoginResponse: {
      access_token: string;
      token_type: string;
      expires_in: number;
    };
    AuthRegisterRequest: {
      email: string;
      password: string;
      role: "parent" | "reviewer" | "teacher";
    };
    CreateChildRequest: {
      nickname: string;
      avatar_id: string;
      birth_year: number;
      parent_email: string;
    };
    CreateChildResponse: {
      id: string;
      access_token: string;
    };
    CreateClassRequest: {
      name: string;
    };
    CreateClassResponse: {
      id: string;
      class_code: string;
      name: string;
    };
    SubscriptionResponse: {
      status: string;
      plan: string | null;
      current_period_end: string | null;
      is_premium: boolean;
    };
    CheckoutRequest: {
      plan: "monthly" | "annual";
    };
    CheckoutResponse: {
      url: string;
    };
    ProgressSummary: {
      level: number;
      total_xp: number;
      rank: string;
    };
  };
}

export interface operations {
  authRegister: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["AuthRegisterRequest"];
      };
    };
    responses: {
      201: { content: never };
      422: { content: never };
    };
  };
  authLogin: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["AuthLoginRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["AuthLoginResponse"];
        };
      };
      401: { content: never };
    };
  };
  authRefresh: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["AuthLoginResponse"];
        };
      };
    };
  };
  authLogout: {
    responses: {
      204: { content: never };
    };
  };
  authVerifyEmail: {
    responses: {
      200: { content: never };
    };
  };
  createChild: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateChildRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["CreateChildResponse"];
        };
      };
    };
  };
  createClass: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateClassRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["CreateClassResponse"];
        };
      };
    };
  };
  getChild: {
    parameters: {
      path: { id: string };
    };
    responses: {
      200: { content: { "application/json": unknown } };
      404: { content: never };
    };
  };
  getProgressSummary: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProgressSummary"];
        };
      };
    };
  };
  getProgressXp: {
    responses: {
      200: {
        content: {
          "application/json": unknown[];
        };
      };
    };
  };
  getProgressBadges: {
    responses: {
      200: {
        content: {
          "application/json": unknown[];
        };
      };
    };
  };
  billingCheckout: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CheckoutRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CheckoutResponse"];
        };
      };
    };
  };
  billingPortal: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CheckoutResponse"];
        };
      };
    };
  };
  getSubscription: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["SubscriptionResponse"];
        };
      };
    };
  };
  getPremiumCheck: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["SubscriptionResponse"];
        };
      };
    };
  };
}
