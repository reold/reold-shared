# Reold Shared Modules
This repo contains some commonly used modules in Reold web apps. Some of these include authentication logic, components, etc. It is built completely using SvelteKit.

## `/auth` basics
```svelte
<script>
  import { onMount } from 'svelte';
  import { initAuth, processAuthFromUrl } from 'reold-shared';

  onMount(() => {
    processAuthFromUrl(); // handle redirect fallback first
    initAuth();           // then verify/refresh any existing token
  });
</script>
```