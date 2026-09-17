import styles from './styles.module.scss';

// This component adds CSS Cascade Layer definitions at the top of all CSS chunks.
// Next.js determines the ordering based on the name of the component (alphabetical order).
// This component is named 'AaCSSLayerDefinitions' to ensure it is loaded first.
// This component is used in the layout.tsx component.

const AaCSSLayerDefinitions = () => <div className={styles.layers} />;

export default AaCSSLayerDefinitions;
