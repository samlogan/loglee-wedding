'use client';

import { useEffect } from 'react';

const WmAscii = () => {
  const ascii = `
  Made by
  ███╗░░░███╗░█████╗░███╗░░░███╗███╗░░░███╗░█████╗░████████╗██╗░░██╗░██████╗
  ████╗░████║██╔══██╗████╗░████║████╗░████║██╔══██╗╚══██╔══╝██║░░██║██╔════╝
  ██╔████╔██║███████║██╔████╔██║██╔████╔██║██║░░██║░░░██║░░░███████║╚█████╗░
  ██║╚██╔╝██║██╔══██║██║╚██╔╝██║██║╚██╔╝██║██║░░██║░░░██║░░░██╔══██║░╚═══██╗
  ██║░╚═╝░██║██║░░██║██║░╚═╝░██║██║░╚═╝░██║╚█████╔╝░░░██║░░░██║░░██║██████╔╝
  ╚═╝░░░░░╚═╝╚═╝░░╚═╝╚═╝░░░░░╚═╝╚═╝░░░░░╚═╝░╚════╝░░░░╚═╝░░░╚═╝░░╚═╝╚═════╝░
  https://mammoth.tech
  `;

  useEffect(() => {
    const domFirstChild = document.documentElement.firstChild;
    const commentExists = domFirstChild?.textContent?.includes('Made by');
    if (!commentExists) {
      const comment = document.createComment(ascii);
      document.documentElement.prepend(comment);
      console.log(ascii);
    }
  }, [ascii]);

  return <></>;
};

export default WmAscii;
