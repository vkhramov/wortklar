import { useState } from 'react';
import { wordImageUrl } from '../lib/wordImages';

type Props = {
  entryId: string;
  alt?: string;
  /** Larger preview on the library word card. */
  size?: 'sm' | 'lg';
};

export function WordPhoto({ entryId, alt = '', size = 'sm' }: Props) {
  const url = wordImageUrl(entryId);
  const [failed, setFailed] = useState(false);

  if (!url || failed) return null;

  return (
    <div className={`word-photo word-photo-${size}`} aria-hidden={!alt}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
