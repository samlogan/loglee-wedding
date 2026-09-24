import { TbBuildingBank } from 'react-icons/tb';
import { defineType } from 'sanity';

/**
 * How guests pay their room contribution — one document, `paymentDetails`, listed with the
 * nationality notes because which version a guest sees depends on the Nationality in their row of
 * the guest sheet (`paymentRegionOf`): the Australian account when it is blank or Australian, Wise
 * for everyone else.
 *
 * Shown only after a guest has replied — on the thank-you page and in the thank-you email.
 */
interface IPaymentDetails {
  _id: string;
  _type: 'paymentDetails';
  australia?: SanityTextBlock[];
  international?: SanityTextBlock[];
}

const paymentDetails = defineType({
  fields: [
    {
      description:
        'Bank transfer details for the Australian account. Shown to guests whose Nationality in the guest sheet is blank or Australian.',
      name: 'australia',
      title: 'Australian guests — bank transfer',
      type: 'blockContentStandard'
    },
    {
      description: 'Wise details. Shown to every other guest.',
      name: 'international',
      title: 'International guests — Wise',
      type: 'blockContentStandard'
    }
  ],
  icon: TbBuildingBank,
  name: 'paymentDetails',
  preview: {
    prepare: () => ({ title: 'Payment details' })
  },
  title: 'Payment details',
  type: 'document'
});

export default paymentDetails;
export type { IPaymentDetails };
