import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Field from '@/components/Field';

import Form from '.';

const meta = {
  title: 'Forms/Form',
  component: Form,
  tags: ['autodocs']
} satisfies Meta<typeof Form>;

export default meta;

type Story = StoryObj<typeof meta>;

const fields = (
  <>
    <Field.Text label="First name" name="firstName" required />
    <Field.Email label="Email" name="email" required />
    <Field.TextArea label="Message" name="message" />
  </>
);

export const Default: Story = { args: { children: fields, formId: 'storybook-form-default' } };

export const Secondary: Story = {
  args: { children: fields, theme: 'secondary', formId: 'storybook-form-secondary' }
};
