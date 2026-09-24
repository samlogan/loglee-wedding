import { useState } from 'react';
import type { DocumentActionComponent, DocumentActionProps } from 'sanity';

/**
 * Wrap Sanity's Publish for guest email sends, because publishing one sends it.
 *
 * - **A test** (a Test Address filled in) publishes as normal, relabelled "Send test".
 * - **A send to the guest list** is relabelled "Send invitations…" / "Send reminders…", shown in the
 *   critical tone, and asks first in a dialog that says plainly it emails real guests. Only
 *   confirming publishes.
 *
 * The typed confirmation field on the document is the second lock: Publish stays disabled until it
 * matches, because Sanity will not publish a document with a validation error.
 */
const withSendConfirmation = (Publish: DocumentActionComponent): DocumentActionComponent => {
  const SendAction = (props: DocumentActionProps) => {
    const original = Publish(props);
    const [confirming, setConfirming] = useState(false);
    if (!original) {
      return original;
    }

    const document = props.draft ?? props.published;
    if (document?.testEmail) {
      return { ...original, label: 'Send test' };
    }

    const what = document?.kind === 'reminder' ? 'reminders' : 'invitations';
    return {
      ...original,
      dialog: confirming && {
        message: `This will email ${what} to real guests on the guest list. It cannot be undone. Send now?`,
        onCancel: () => {
          setConfirming(false);
          props.onComplete();
        },
        onConfirm: () => {
          setConfirming(false);
          original.onHandle?.();
        },
        tone: 'critical' as const,
        type: 'confirm' as const
      },
      label: `Send ${what}…`,
      onHandle: () => setConfirming(true),
      tone: 'critical' as const
    };
  };
  SendAction.action = Publish.action;
  return SendAction;
};

export default withSendConfirmation;
