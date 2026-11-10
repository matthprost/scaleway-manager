import type { Organization, Project, Session, User } from '@scaleway-manager/core';

export const DEMO_SESSION: Session = {
  token: 'demo',
  renewToken: 'demo',
  sessionId: 'demo',
  userId: 'demo',
  expiresAt: '2999-12-31T23:59:59.000Z',
};

export const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@example.com',
  organizationId: 'demo-org',
};

export const DEMO_ORGANIZATION: Organization = { id: 'demo-org', name: 'Acme' };

export const DEMO_PROJECTS: Project[] = [
  { id: 'demo-prod', name: 'Production', organizationId: 'demo-org' },
  { id: 'demo-staging', name: 'Staging', organizationId: 'demo-org' },
];

// A tiny valid one-page PDF.
export const DEMO_PDF_BASE64 =
  'JVBERi0xLjEKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgL01lZGlhQm94IFswIDAgMjAwIDIwMF0gPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAzNSA+PgpzdHJlYW0KQlQgL0YxIDEyIFRmIDIwIDEwMCBUZCAoRGVtbykgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTM5IDAwMDAwIG4gCjAwMDAwMDAyMDIgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA1IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoyODcKJSVFT0YK';
