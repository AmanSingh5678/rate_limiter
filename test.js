// test.js
async function hammerAPI() {
  const url = 'http://localhost:3000/api/data';
  
  console.log('Firing 20 requests at the exact same millisecond...\n');

  // Create an array of 10 fetch promises
  const requests = Array.from({ length: 20 }).map((_, i) => {
    return fetch(url).then(async (res) => {
      const body = await res.json();
      return `Request ${i + 1}: Status ${res.status} - Remaining: ${res.headers.get('X-RateLimit-Remaining')} - ${JSON.stringify(body)}`;
    });
  });

  // Fire them all concurrently
  const results = await Promise.all(requests);
  
  results.forEach(result => console.log(result));
}

hammerAPI();