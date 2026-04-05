On any site (plain HTML, Google Sites, WordPress, Shopify, etc.), place:

xml
<script>
  // Replace per site
  window.MAKE_WEBHOOK_URL = "https://hook.us2.make.com/kkyfx0yc5b82h9qpqo6v6hecdlxms0qb";
  window.API_KEY = "your-api-key";
  window.BUSINESS_ID = "local-cafe-123";

  window.threadId = "thread-" + Math.random().toString(36).substr(2, 9);
</script>

<script src="https://yourusername.github.io/localbusinessservices/chat-widget.js" defer></script>
