export function printablesIsLicenseSupported(pubmanLicense) {
  return false; // TODO: Licenses are based on numeric IDs, pulled from the graphql API
}

export function printablesIsCategorySupported(pubmanCategory) {
  return false; // TODO: Categories are based on numeric IDs, pulled from the graphql API
}

const queryUserInfo = `
query Me($userId: ID) {
  me(userId: $userId) {
    id
    designerStatus
    designerPublishedDate
    storeActive
    storeFee
    maxStoreModels: maxPaidModels
    soldModelsCount: soldPrintsCount
    nsfw
    showAiGenerated
    showCloudSlicer
    showPrusaSlicer
    isStaff
    canCreateEventsAndGroups
    thingiverseProfileUrl
    thingiverseProfileVerificationStatus
    email
    otpEnabled
    followingCount
    advancedImportEnabled
    downloadedModelsCount: downloadedPrintsCount
    downloadedEduProjectsCount
    publishedModelsCount: publishedPrintsCount
    publishedEduProjectsCount
    membershipCount
    clubSubscriber
    purchasedModelIds: purchasedPrintIds
    affiliateVisible
    prusaPrinterOwner
    storeSale
    user {
      ...AvatarUser
      brand: company
      canBeFollowed
      dateCreated
      isTeacher
      clubModelsCount: premiumPrintsCount
      likesCountModels: likesCountPrints
      likesCountEduProjects
      storeModelsCount: paidModelsCount
      followersCount
      collectionsCount
      printers {
        id
        name
        __typename
      }
      __typename
    }
    managedUsers {
      ...AvatarUser
      __typename
    }
    ...Poller
    __typename
  }
  memberships: subscriptions(limit: 4999, status: ACTIVE) {
    items {
      id
      designer {
        id
        __typename
      }
      __typename
    }
    __typename
  }
}
fragment AvatarUser on UserType {
  id
  handle
  verified
  dateVerified
  publicUsername
  avatarFilePath
  badgesProfileLevel {
    profileLevel
    __typename
  }
  __typename
}
fragment Poller on MeUserType {
  prusameterPoints {
    total
    unread
    totalSpent
    totalEarned
    __typename
  }
  newNotificationsCount
  unreadConversationsCount
  __typename
}`;

const queryModelDetail = `
query ModelDetail($id: ID!, $loadPurchase: Boolean!) {
  model: print(id: $id) {
    ...ModelDetailEditable
    priceBeforeSale
    purchaseDate @include(if: $loadPurchase)
    paidPrice @include(if: $loadPurchase)
    giveawayDate @include(if: $loadPurchase)
    mmu
    user {
      ...AvatarUser
      isFollowedByMe
      isHiddenForMe
      canBeFollowed
      billingAccountType
      lowestTierPrice
      highlightedModels {
        models {
          ...Model
          __typename
        }
        featured
        __typename
      }
      designer
      stripeAccountActive
      membership {
        id
        currentTier {
          id
          name
          benefits {
            id
            title
            benefitType
            description
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
    contests: competitions {
      id
      name
      slug
      description
      isOpen
      __typename
    }
    contestsResults: competitionResults {
      ranking: placement
      contest: competition {
        id
        name
        slug
        modelsCount: printsCount
        openFrom
        openTo
        __typename
      }
      __typename
    }
    prusameterPoints
    ...LatestContestResult
    __typename
  }
}
fragment AvatarUser on UserType {
  id
  handle
  verified
  dateVerified
  publicUsername
  avatarFilePath
  badgesProfileLevel {
    profileLevel
    __typename
  }
  __typename
}
fragment LatestContestResult on PrintType {
  latestContestResult: latestCompetitionResult {
    ranking: placement
    competitionId
    __typename
  }
  __typename
}
fragment Model on PrintType {
  id
  name
  slug
  ratingAvg
  likesCount
  liked
  datePublished
  dateFeatured
  firstPublish
  downloadCount
  mmu
  category {
    id
    path {
      id
      name
      nameEn
      __typename
    }
    __typename
  }
  modified
  image {
    ...SimpleImage
    __typename
  }
  nsfw
  aiGenerated
  club: premium
  price
  priceBeforeSale
  user {
    ...AvatarUser
    isHiddenForMe
    __typename
  }
  ...LatestContestResult
  __typename
}
fragment ModelDetailEditable on PrintType {
  id
  slug
  name
  authorship
  club: premium
  excludeCommercialUsage
  price
  eduProject {
    id
    __typename
  }
  ratingAvg
  myRating
  ratingCount
  description
  category {
    id
    path {
      id
      name
      nameEn
      description
      __typename
    }
    __typename
  }
  modified
  firstPublish
  datePublished
  dateCreatedThingiverse
  nsfw
  aiGenerated
  summary
  likesCount
  makesCount
  liked
  printDuration
  numPieces
  weight
  nozzleDiameters
  usedMaterial
  layerHeights
  mmu
  materials {
    id
    name
    __typename
  }
  dateFeatured
  downloadCount
  displayCount
  filesCount
  privateCollectionsCount
  publicCollectionsCount
  pdfFilePath
  commentCount
  userGcodeCount
  remixCount
  canBeRated
  printer {
    id
    name
    __typename
  }
  image {
    ...SimpleImage
    __typename
  }
  images {
    ...SimpleImage
    __typename
  }
  tags {
    name
    id
    __typename
  }
  thingiverseLink
  filesType
  previewFile {
    ...PreviewFile
    __typename
  }
  license {
    id
    disallowRemixing
    __typename
  }
  remixParents {
    ...RemixParent
    __typename
  }
  remixDescription
  __typename
}
fragment PreviewFile on PreviewFileUnionType {
  ... on STLType {
    id
    filePreviewPath
    __typename
  }
  ... on SLAType {
    id
    filePreviewPath
    __typename
  }
  ... on GCodeType {
    id
    filePreviewPath
    __typename
  }
  __typename
}
fragment RemixParent on PrintRemixType {
  id
  modelId: parentPrintId
  modelName: parentPrintName
  modelAuthor: parentPrintAuthor {
    id
    handle
    verified
    publicUsername
    __typename
  }
  model: parentPrint {
    ...RemixParentModel
    __typename
  }
  url
  urlAuthor
  urlImage
  urlTitle
  urlLicense {
    id
    name
    disallowRemixing
    __typename
  }
  urlLicenseText
  __typename
}
fragment RemixParentModel on PrintType {
  id
  name
  slug
  datePublished
  image {
    ...SimpleImage
    __typename
  }
  club: premium
  authorship
  license {
    id
    name
    disallowRemixing
    __typename
  }
  eduProject {
    id
    __typename
  }
  __typename
}
fragment SimpleImage on PrintImageType {
  id
  filePath
  rotation
  imageHash
  imageWidth
  imageHeight
  __typename
}`;

const queryUserModelsList = `
query UserModels($id: ID!, $paid: PaidEnum, $limit: Int!, $cursor: String, $ordering: String, $search: String) {
  userModels(
    userId: $id
    paid: $paid
    limit: $limit
    cursor: $cursor
    ordering: $ordering
    query: $search
  ) {
    cursor
    items {
      ...Model
      __typename
    }
    __typename
  }
}
fragment AvatarUser on UserType {
  id
  handle
  verified
  dateVerified
  publicUsername
  avatarFilePath
  badgesProfileLevel {
    profileLevel
    __typename
  }
  __typename
}
fragment LatestContestResult on PrintType {
  latestContestResult: latestCompetitionResult {
    ranking: placement
    competitionId
    __typename
  }
  __typename
}
fragment Model on PrintType {
  id
  name
  slug
  ratingAvg
  likesCount
  liked
  datePublished
  dateFeatured
  firstPublish
  downloadCount
  mmu
  category {
    id
    path {
      id
      name
      nameEn
      __typename
    }
    __typename
  }
  modified
  image {
    ...SimpleImage
    __typename
  }
  nsfw
  aiGenerated
  club: premium
  price
  priceBeforeSale
  user {
    ...AvatarUser
    isHiddenForMe
    __typename
  }
  ...LatestContestResult
  __typename
}
fragment SimpleImage on PrintImageType {
  id
  filePath
  rotation
  imageHash
  imageWidth
  imageHeight
  __typename
}`;

const mutationCreateOrUpdateModel = `
mutation ModelUpdate($tags: [ID], $id: ID, $description: String, $printer: ID, $category: ID, $variationOf: ID, $license: ID, $mainImage: ID, $name: String, $draft: Boolean, $summary: String, $remixParents: [ID], $nsfw: Boolean, $aiGenerated: Boolean, $authorship: PrintAuthorshipEnum, $remixDescription: String, $club: Boolean, $price: Int, $excludeCommercialUsage: Boolean, $slas: [SLAFileInputType], $gcodes: [GcodeFileInputType], $stls: [STLFileInputType], $otherFiles: [OtherFileInputType], $images: [PrintImageInputType]) {
  modelUpdate(
    tags: $tags
    id: $id
    summary: $summary
    description: $description
    draft: $draft
    printer: $printer
    category: $category
    variationOf: $variationOf
    license: $license
    mainImage: $mainImage
    name: $name
    remixParents: $remixParents
    nsfw: $nsfw
    aiGenerated: $aiGenerated
    authorship: $authorship
    remixDescription: $remixDescription
    premium: $club
    price: $price
    excludeCommercialUsage: $excludeCommercialUsage
    slas: $slas
    gcodes: $gcodes
    stls: $stls
    otherFiles: $otherFiles
    images: $images
  ) {
    ok
    output {
      ...ModelDetailEditable
      __typename
    }
    errors {
      ...Error
      __typename
    }
    __typename
  }
}
fragment Error on ErrorType {
  field
  messages
  __typename
}
fragment ModelDetailEditable on PrintType {
  id
  slug
  name
  authorship
  club: premium
  excludeCommercialUsage
  price
  eduProject {
    id
    __typename
  }
  ratingAvg
  myRating
  ratingCount
  description
  category {
    id
    path {
      id
      name
      nameEn
      description
      __typename
    }
    __typename
  }
  modified
  firstPublish
  datePublished
  dateCreatedThingiverse
  nsfw
  aiGenerated
  summary
  likesCount
  makesCount
  liked
  printDuration
  numPieces
  weight
  nozzleDiameters
  usedMaterial
  layerHeights
  mmu
  materials {
    id
    name
    __typename
  }
  dateFeatured
  downloadCount
  displayCount
  filesCount
  privateCollectionsCount
  publicCollectionsCount
  pdfFilePath
  commentCount
  userGcodeCount
  remixCount
  canBeRated
  printer {
    id
    name
    __typename
  }
  image {
    ...SimpleImage
    __typename
  }
  images {
    ...SimpleImage
    __typename
  }
  tags {
    name
    id
    __typename
  }
  thingiverseLink
  filesType
  previewFile {
    ...PreviewFile
    __typename
  }
  license {
    id
    disallowRemixing
    __typename
  }
  remixParents {
    ...RemixParent
    __typename
  }
  remixDescription
  __typename
}
fragment PreviewFile on PreviewFileUnionType {
  ... on STLType {
    id
    filePreviewPath
    __typename
  }
  ... on SLAType {
    id
    filePreviewPath
    __typename
  }
  ... on GCodeType {
    id
    filePreviewPath
    __typename
  }
  __typename
}
fragment RemixParent on PrintRemixType {
  id
  modelId: parentPrintId
  modelName: parentPrintName
  modelAuthor: parentPrintAuthor {
    id
    handle
    verified
    publicUsername
    __typename
  }
  model: parentPrint {
    ...RemixParentModel
    __typename
  }
  url
  urlAuthor
  urlImage
  urlTitle
  urlLicense {
    id
    name
    disallowRemixing
    __typename
  }
  urlLicenseText
  __typename
}
fragment RemixParentModel on PrintType {
  id
  name
  slug
  datePublished
  image {
    ...SimpleImage
    __typename
  }
  club: premium
  authorship
  license {
    id
    name
    disallowRemixing
    __typename
  }
  eduProject {
    id
    __typename
  }
  __typename
}
fragment SimpleImage on PrintImageType {
  id
  filePath
  rotation
  imageHash
  imageWidth
  imageHeight
  __typename
}`;

const mutationPrepareUpload = `
    mutation UploadModel($fileName: String!, $folder: String!, $unzip: Boolean!, $imageHash: String, $imageHeight: Int, $imageWidth: Int) {
      upload: printFileUpload2(
        fileName: $fileName
        folder: $folder
        unzip: $unzip
        imageHash: $imageHash
        imageHeight: $imageHeight
        imageWidth: $imageWidth
      ) {
        ok
        errors {
          ...Error
          __typename
        }
        uploadData {
          url
          fields
          __typename
        }
        fileUpload {
          id
          __typename
        }
        __typename
      }
    }
    fragment Error on ErrorType {
      field
      messages
      __typename
    }`;

const mutationFinalizeUpload = `
    mutation UploadModelFinished($fileUploadId: ID!) {
      uploadFinished: printFileUploadFinished(fileUploadId: $fileUploadId) {
        ok
        errors {
          ...Error
          __typename
        }
        output {
          id
          filePath
          __typename
        }
        __typename
      }
    }
    fragment Error on ErrorType {
      field
      messages
      __typename
    }`;

export class PrintablesAPI {
  constructor(accessToken = '') {
    this.baseUrl = 'https://www.printables.com';
    this.apiUrl = 'https://api.printables.com';
    this.headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Host': 'api.printables.com',
      'Content-Type': 'application/json',
    };
  }

  setAccessToken(accessToken) {
    this.headers.Authorization = `Bearer ${accessToken}`;
  }

  async graphql(query, variables = {}) {
    const url = `${this.apiUrl}/graphql/`
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Printables API error: ${url} ${JSON.stringify(variables)} ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUserInfo() {
    // A way to get user info without needing to pass userId
    const response = await this.graphql(queryUserInfo, {
      userId: null,
    });
    if (!response || !response.data || !response.data.me) {
      throw new Error('Failed to fetch user info');
    }
    return response.data.me
  }

  async getModelById(modelId) {
    const response = await this.graphql(queryModelDetail, {
      "id": JSON.stringify(modelId),
      "loadPurchase": false
    });
    if (!response || !response.data || !response.data.model) {
      throw new Error('Failed to fetch model info');
    }
    return response.data.model
  }

  async getModelsByUsername(username, limit = 30) {
    const response = await this.graphql(queryUserModelsList, {
      "cursor": null,
      "id": `@${username}`,
      "limit": limit,
      "ordering": "-first_publish",
      "paid": "free",
      "search": null
    });
    if (!response || !response.data || !response.data.userModels) {
      throw new Error('Failed to fetch models by username');
    }
    return response.data.userModels.items;
  }

  async createModel(modelData) {
    const {description, draft, id, name, remixDescription, summary, tags, ...otherModelData} = modelData;
    const variables = {
      "aiGenerated": false,
      "authorship": "author",
      "club": false,
      "description": description,
      "draft": draft !== false,
      "id": id || null, // null for new model
      "name": name,
      "nsfw": false,
      "price": 0,
      "printer": null,
      "remixDescription": remixDescription || null,
      "remixParents": [],
      "summary": summary,
      "tags": tags,
      ...otherModelData
      // "category": "5",
      // "license": "6",
      // "excludeCommercialUsage": false,
      // "gcodes": null,
      // "images": [
      //   {
      //     "id": "4451286"
      //   }
      // ],
      // "stls": [
      //   {
      //     "folder": "",
      //     "id": "5410856",
      //     "name": "man.stl",
      //     "note": ""
      //   }
      // ],
      // "slas": null,
      // "otherFiles": null,
    };

    const response = await this.graphql(mutationCreateOrUpdateModel, variables);
    if (!response || !response.data || !response.data.modelUpdate) {
      throw new Error('Failed to create model');
    }
    if (response.errors.length > 0) {
      throw new Error(`Failed to create model: ${response.errors.map(e => e.messages).join(', ')}`);
    }
    if (!response.data.modelUpdate.ok) {
      throw new Error(`Failed to create model: ${response.data.modelUpdate.errors.map(e => e.messages).join(', ')}`);
    }
    return response.data.modelUpdate.output;
  }

  async updateModel(updates) {
    const variables = {
      ...updates,
    };
    const response = await this.graphql(mutationCreateOrUpdateModel, variables);
    if (!response || !response.data || !response.data.modelUpdate) {
      throw new Error('Failed to update model');
    }
    if (response.errors.length > 0) {
      throw new Error(`Failed to update model: ${response.errors.map(e => e.messages).join(', ')}`);
    }
    if (!response.data.modelUpdate.ok) {
      throw new Error(`Failed to update model: ${response.data.modelUpdate.errors.map(e => e.messages).join(', ')}`);
    }
    return response.data.modelUpdate.output;
  }

  // NOTE: deleting file is done by updateModel
  // async deleteFile(thingId, fileId) {}

  // NOTE: deleting images is done by updateModel
  // async deleteImage(thingId, imageId) {}

  async uploadFile(fileName, fileBuffer, fileMetadata = {}) {
    // Note: For images only, fileMetadata includes {imageHash, imageHeight, imageWidth}
    // Step 1: Prepare the upload
    const prepareVariables = {
      "fileName": fileName,
      "folder": "",
      ...fileMetadata,
      "unzip": true
    }
    const prepareResponse = await this.graphql(mutationPrepareUpload, prepareVariables);
    if (!prepareResponse || !prepareResponse.data || !prepareResponse.data.upload) {
      throw new Error('Failed to prepare image upload');
    }
    if (prepareResponse.errors.length > 0) {
      throw new Error(`Failed to prepare image upload: ${prepareResponse.errors.map(e => e.messages).join(', ')}`);
    }
    if (!prepareResponse.data.upload.ok) {
      throw new Error(`Failed to prepare image upload: ${prepareResponse.data.upload.errors.map(e => e.messages).join(', ')}`);
    }
    const uploadData = prepareResponse.data.upload.uploadData;

    // Step 2: Upload the file to the storage provider
    const formData = new FormData();
    for (const [key, value] of Object.entries(prepareResponse.fields)) {
      formData.append(key, value);
    }
    formData.append('file', new Blob([fileBuffer]));

    // note: fetch without any auth or special headers
    const uploadResponse = await fetch(uploadData.url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload error: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    // Step 3: Finalize the upload
    const finalizeVariables = {
      "fileUploadId": prepareResponse.data.upload.fileUpload.id,
    }
    const finalizeResponse = await this.graphql(mutationFinalizeUpload, finalizeVariables);
    if (!finalizeResponse || !finalizeResponse.data || !finalizeResponse.data.uploadFinished) {
      throw new Error('Failed to finalize image upload');
    }
    if (finalizeResponse.errors.length > 0) {
      throw new Error(`Failed to finalize image upload: ${finalizeResponse.errors.map(e => e.messages).join(', ')}`);
    }
    if (!finalizeResponse.data.uploadFinished.ok) {
      throw new Error(`Failed to finalize image upload: ${finalizeResponse.data.uploadFinished.errors.map(e => e.messages).join(', ')}`);
    }
    return finalizeResponse.data.uploadFinished.output;
  }

  // Note: Published is just `draft` set to false, use `updateModel`
  // async publishModel(modelId) {}
}