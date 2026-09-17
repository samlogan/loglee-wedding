import { TbEye } from 'react-icons/tb';
import type { DocumentActionProps } from 'sanity';

const presentationPath = `/studio/visual-editor?preview=`;

const PreviewAction = ({ published, draft }: DocumentActionProps) => {
  const doc = draft || published;
  const currentPathname = doc?.pathname as string | undefined;

  if (!doc || !currentPathname) {
    return null;
  }

  return {
    icon: TbEye,
    label: 'Open Preview',
    onHandle: () => {
      window.open(window.location.origin + presentationPath + currentPathname, `_blank`);
    }
  };
};

export default PreviewAction;
