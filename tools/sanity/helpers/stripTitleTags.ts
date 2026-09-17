// Strips h1, h2, h3, h4, h5, h6 & span tags from html string
const stripTitleTags = (value = '') => value.replaceAll(/<(h[1-6]|span)>|<\/(h[1-6]|span)>/g, '');

export default stripTitleTags;
