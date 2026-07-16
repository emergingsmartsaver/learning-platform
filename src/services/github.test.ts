import { describe, it, expect } from 'vitest';
import { parseGithubUrl } from './github';

describe('parseGithubUrl', () => {
  it('parses a standard github.com repo URL', () => {
    expect(parseGithubUrl('https://github.com/facebook/react')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('strips a trailing .git suffix', () => {
    expect(parseGithubUrl('https://github.com/facebook/react.git')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('ignores extra path segments beyond owner/repo', () => {
    expect(parseGithubUrl('https://github.com/facebook/react/tree/main/packages')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('returns null for a non-GitHub URL', () => {
    expect(parseGithubUrl('https://gitlab.com/facebook/react')).toBeNull();
  });

  it('returns null for a malformed URL', () => {
    expect(parseGithubUrl('not a url')).toBeNull();
  });

  it('returns null when the URL has no repo path', () => {
    expect(parseGithubUrl('https://github.com/facebook')).toBeNull();
  });
});
