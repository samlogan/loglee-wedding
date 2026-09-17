'use client';

import type { FC } from 'react';

import Field from '@/components/Field';
import Form from '@/components/Form';
import Section from '@/components/Section';
import { getSectionSpacingProps } from '@/tools/helpers/section';

export interface FormSectionProps {
  title: string;
}

const FormSection: FC<FormSectionProps> = (props) => (
  <Section name="FormSection" {...getSectionSpacingProps(props)}>
    <Form theme="primary">
      <Field.Text label="First Name" name="firstName" align="left" required />
      <Field.Text label="Last Name" name="lastName" align="right" required />
      <Field.Email label="Email" name="email" align="left" required />
      <Field.Text label="Mobile" name="phone" align="right" />
      <Field.Text label="Postcode" name="postcode" placeholder="Enter postcode" required />
      <Field.TextArea label="Special requests" name="specialRequests" placeholder="Enter any special requests" />
    </Form>
  </Section>
);

export default FormSection;
