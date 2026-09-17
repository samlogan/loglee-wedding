const uploadToFileIo = async (file: File): Promise<string> => {
  const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('expires', expiryDate);
  formData.append('autoDelete', 'true');
  formData.append('maxDownloads', '1');

  const response = await fetch('https://file.io/', {
    body: formData,
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_FILE_IO_API_KEY}`
    },
    method: 'POST'
  });

  const data = await response.json();

  const link = data?.link;
  return link;
};

export default uploadToFileIo;
