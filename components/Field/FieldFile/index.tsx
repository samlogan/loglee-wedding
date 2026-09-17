import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';

import Text from '@/components/Text';

import type { FieldControlledProps } from '../FieldCommon/FieldControlled';
import FieldControlled from '../FieldCommon/FieldControlled';
import uploadToFileIo from './uploadToFileIo';

import styles from './styles.module.scss';

interface FieldFileProps extends FieldControlledProps {
  uploadFile?: (file: File) => Promise<string>;
}

const FieldFile = (props: FieldFileProps) => {
  const { uploadFile = uploadToFileIo, name } = props;

  const [filename, setFilename] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const onClear = () => {
    const input = inputRef?.current;
    if (input) {
      input.value = '';
      setFilename(null);
      setStatus('idle');
    }
  };

  const onChangeHandler = async (event: ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    try {
      setStatus('uploading');
      setMessage(null);
      const file = event?.target?.files?.[0];
      if (!file) {
        throw new Error('No file uploaded');
      }

      if (uploadFile) {
        const fileUrl = await uploadFile(file);
        if (fileUrl) {
          onChange(fileUrl);
        }
      }

      setFilename(file.name);
      setStatus('success');
    } catch (error: unknown) {
      console.log('An error occured while uploading a file.', error instanceof Error ? error.message : error);
      setMessage('An error occured while uploading your file. Please try again.');
      setStatus('idle');
      onClear();
    }
  };

  const uploadInputId = `${name}-file`;

  return (
    <FieldControlled {...props}>
      {({ field }) => (
        <>
          <input
            ref={inputRef}
            onChange={(event) => onChangeHandler(event, field.onChange)}
            type="file"
            name={uploadInputId}
            id={uploadInputId}
            className={styles.input}
          />
          <label htmlFor={uploadInputId} className={styles.label}>
            {status === 'idle' && <Text as="span" text="Upload file" />}
            {status === 'uploading' && <Text as="span" text="Uploading..." />}
            {status === 'success' && <Text as="span" text="File uploaded" />}
          </label>

          <div className={styles.message}>
            <Text as="span" className={styles.clear} text={message} />
          </div>
        </>
      )}
    </FieldControlled>
  );
};

export default FieldFile;
