import { FormData } from 'formdata-node';

export class ThingiverseAPI {
  constructor(accessToken = '') {
    this.baseUrl = 'https://www.thingiverse.com';
    this.apiUrl = 'https://api.thingiverse.com';
    this.headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Host': 'api.thingiverse.com',
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  setAccessToken(accessToken) {
    this.headers.Authorization = `Bearer ${accessToken}`;
  }

  async fetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Thingiverse API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchWithoutAuth(url, options = {}) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { Authorization: _, ...headersWithoutAuth } = this.headers;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headersWithoutAuth,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Thingiverse API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUserInfo() {
    const url = `${this.apiUrl}/users/me`;
    return this.fetch(url);
  }

  async getAuthTokenInfo() {
    const url = `${this.baseUrl}/login/oauth/tokeninfo`;
    const formData = new URLSearchParams();
    formData.append('access_token', this.headers.Authorization.split(' ')[1]);

    return this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  }

  async getThingById(thingId) {
    const url = `${this.apiUrl}/things/${thingId}`;
    return this.fetch(url);
  }

  async getThingsByUsername(username) {
    const url = `${this.apiUrl}/users/${username}/things`;
    return this.fetch(url);
  }

  async createThing(thing) {
    const url = `${this.apiUrl}/things`;
    const payload = {
      name: thing.name,
      category: thing.category,
      tags: thing.tags,
      description: thing.description,
      instructions: thing.instructions,
      is_wip: thing.is_wip,
      license: thing.license,
    };

    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateThing(thingId, updates) {
    const url = `${this.apiUrl}/things/${thingId}`;
    return this.fetch(url, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getFileById(fileId) {
    const url = `${this.apiUrl}/files/${fileId}`;
    return this.fetch(url);
  }

  async getFilesForThing(thingId) {
    const url = `${this.apiUrl}/things/${thingId}/files`;
    return this.fetch(url);
  }

  async uploadFile(thingId, fileName, fileBuffer) {
    // Step 1: Prepare the upload
    const prepareUrl = `${this.apiUrl}/things/${thingId}/files`;
    const preparePayload = { filename: fileName };

    const prepareResponse = await this.fetch(prepareUrl, {
      method: 'POST',
      body: JSON.stringify(preparePayload),
    });

    // Step 2: Upload the file to the storage provider
    const formData = new FormData();
    for (const [key, value] of Object.entries(prepareResponse.fields)) {
      formData.append(key, value);
    }
    formData.append('file', new Blob([fileBuffer]));

    const uploadResponse = await fetch(prepareResponse.action, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload error: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    // Step 3: Finalize the upload
    const finalizeResponse = await fetch(prepareResponse.fields.success_action_redirect, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(prepareResponse.fields),
    });

    if (!finalizeResponse.ok) {
      throw new Error(`File finalization error: ${finalizeResponse.status} ${finalizeResponse.statusText}`);
    }

    return finalizeResponse.json();
  }

  async publishThing(thingId) {
    const url = `${this.apiUrl}/things/${thingId}/publish`;
    return this.fetch(url, {
      method: 'POST',
    });
  }
}