import React from 'react';
import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    nextjs: { appDirectory: true },
  },
  globalTypes: {
    direction: {
      name: 'Direction',
      description: 'Text direction',
      defaultValue: 'ltr',
      toolbar: { icon: 'globe', items: ['ltr', 'rtl'] },
    },
  },
  decorators: [
    (Story, context) => {
      const dir = (context.globals.direction ?? 'ltr') as string;
      return <div dir={dir}><Story /></div>;
    },
  ],
};
export default preview;
