export const defaultThingiverseLicense = 'cc-nc-nd';
export const licenseToThingiverseMap = {
  'CC': 'cc',
  'CC0': 'pd0',
  'CC-BY': 'cc',
  'CC-BY-SA': 'cc-sa',
  'CC-BY-ND': 'cc-nd',
  'CC-BY-NC': 'cc-nc',
  'CC-BY-NC-SA': 'cc-nc-sa',
  'CC-BY-NC-ND': 'cc-nc-nd',
  'GPL-2.0': 'gpl',
  'GPL-3.0': 'gpl',
  'LGPL': 'lgpl',
  'BSD': 'bsd',
  // Default to standard Creative Commons license for unknown types
  'SDFL': defaultThingiverseLicense
};

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
      throw new Error(`Thingiverse API error: ${url} ${JSON.stringify(options)} ${response.status} ${response.statusText}`);
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
      license: licenseToThingiverseMap[thing.license] || defaultThingiverseLicense,
    };

    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateThing(thingId, updates) {
    const url = `${this.apiUrl}/things/${thingId}`;
    if ('license' in updates) {
      updates.license = licenseToThingiverseMap[updates.license] || defaultThingiverseLicense;
    }
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

  async deleteFile(thingId, fileId) {
    const url = `${this.apiUrl}/things/${thingId}/files/${fileId}`;
    return this.fetch(url, {
      method: 'DELETE',
    });
  }

  async getImagesForThing(thingId) {
    const url = `${this.apiUrl}/things/${thingId}/images`;
    return this.fetch(url);
  }

  async deleteImage(thingId, imageId) {
    const url = `${this.apiUrl}/things/${thingId}/images/${imageId}`;
    return this.fetch(url, {
      method: 'DELETE',
    });
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

    // note: fetch without any auth or special headers
    const uploadResponse = await fetch(prepareResponse.action, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload error: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    // Step 3: Finalize the upload
    return await this.fetch(prepareResponse.fields.success_action_redirect, {
      method: 'POST',
      body: new URLSearchParams(prepareResponse.fields),
    });
  }

  async publishThing(thingId) {
    const url = `${this.apiUrl}/things/${thingId}/publish`;
    return this.fetch(url, {
      method: 'POST',
    });
  }
}