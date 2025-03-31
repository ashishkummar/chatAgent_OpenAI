  // Configure marked to add target="_blank" to all links
  const renderer = new marked.Renderer();
  renderer.link = function (href, title, text) {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  // Set custom renderer in marked
  marked.setOptions({
    renderer: renderer,
    breaks: true,
  });