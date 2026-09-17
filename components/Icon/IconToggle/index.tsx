import classNames from '@/helpers/classNames';

import './style.scss';

interface IconToggleProps {
  className?: string;
  selected?: boolean;
}

const IconToggle = (props: IconToggleProps) => {
  const { className, selected } = props;
  const classes = classNames(className, 'icon-toggle', { selected });
  return (
    <div className={classes}>
      <div className="horizontal"></div>
      <div className="vertical"></div>
    </div>
  );
};

export default IconToggle;
