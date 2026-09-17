interface ReadOnlyImageInputProps {
  schemaType?: { imageUrl?: string };
}

const ReadOnlyImageInput = (props: ReadOnlyImageInputProps) => {
  const { schemaType } = props;
  const { imageUrl } = schemaType || {};

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Section Preview" style={{ height: 'auto', width: '400px' }} />
    </div>
  );
};

export default ReadOnlyImageInput;
