// Redirect Netlify Identity email links from the public site to the admin app.
(function redirectIdentityTokenToAdmin() {
  const hash = window.location.hash || '';
  const identityTokens = ['invite_token=', 'recovery_token=', 'confirmation_token=', 'email_change_token='];
  const hasIdentityToken = identityTokens.some((token) => hash.includes(token));

  if (hasIdentityToken && !window.location.pathname.includes('/admin/')) {
    const basePath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    window.location.replace(`${window.location.origin}${basePath}/admin/${hash}`);
  }
})();
