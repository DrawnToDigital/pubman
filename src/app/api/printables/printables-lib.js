import log from 'electron-log/renderer';

export const printablesCategories = {
  "3D Printers": {"id": "1", "path": ["3D Printers"], "pathIds": ["1"], "disabled": true},
  "Prusa Parts & Upgrades": {"id": "134", "path": ["3D Printers", "Prusa Parts & Upgrades"], "pathIds": ["1", "134"]},
  "Accessories": {"id": "40", "path": ["3D Printers", "Accessories"], "pathIds": ["1", "40"]},
  "Anycubic Parts & Upgrades": {"id": "138", "path": ["3D Printers", "Anycubic Parts & Upgrades"], "pathIds": ["1", "138"]},
  "Bambu Lab Parts & Upgrades": {"id": "136", "path": ["3D Printers", "Bambu Lab Parts & Upgrades"], "pathIds": ["1", "136"]},
  "Creality Parts & Upgrades": {"id": "135", "path": ["3D Printers", "Creality Parts & Upgrades"], "pathIds": ["1", "135"]},
  "Other Printer Parts & Upgrades": {"id": "2", "path": ["3D Printers", "Other Printer Parts & Upgrades"], "pathIds": ["1", "2"]},
  "Voron Parts & Upgrades": {"id": "137", "path": ["3D Printers", "Voron Parts & Upgrades"], "pathIds": ["1", "137"]},
  "Test Models": {"id": "12", "path": ["3D Printers", "Test Models"], "pathIds": ["1", "12"]},
  "Art & Design": {"id": "13", "path": ["Art & Design"], "pathIds": ["13"], "disabled": true},
  "2D Plates & Logos": {"id": "16", "path": ["Art & Design", "2D Plates & Logos"], "pathIds": ["13", "16"]},
  "Sculptures": {"id": "14", "path": ["Art & Design", "Sculptures"], "pathIds": ["13", "14"]},
  "Wall-mounted": {"id": "15", "path": ["Art & Design", "Wall-mounted"], "pathIds": ["13", "15"]},
  "Other Art & Designs": {"id": "41", "path": ["Art & Design", "Other Art & Designs"], "pathIds": ["13", "41"]},
  "Costumes & Accessories": {"id": "76", "path": ["Costumes & Accessories"], "pathIds": ["76"], "disabled": true},
  "Cosplay & Costumes in general": {"id": "77", "path": ["Costumes & Accessories", "Cosplay & Costumes in general"], "pathIds": ["76", "77"]},
  "Masks": {"id": "78", "path": ["Costumes & Accessories", "Masks"], "pathIds": ["76", "78"]},
  "Props": {"id": "81", "path": ["Costumes & Accessories", "Props"], "pathIds": ["76", "81"]},
  "Other Costume Accessories": {"id": "80", "path": ["Costumes & Accessories", "Other Costume Accessories"], "pathIds": ["76", "80"]},
  "Fashion": {"id": "17", "path": ["Fashion"], "pathIds": ["17"], "disabled": true},
  "Men": {"id": "18", "path": ["Fashion", "Men"], "pathIds": ["17", "18"]},
  "Women": {"id": "20", "path": ["Fashion", "Women"], "pathIds": ["17", "20"]},
  "Other Fashion Accessories": {"id": "42", "path": ["Fashion", "Other Fashion Accessories"], "pathIds": ["17", "42"]},
  "Gadgets": {"id": "21", "path": ["Gadgets"], "pathIds": ["21"], "disabled": true},
  "Audio": {"id": "25", "path": ["Gadgets", "Audio"], "pathIds": ["21", "25"]},
  "Computers": {"id": "27", "path": ["Gadgets", "Computers"], "pathIds": ["21", "27"]},
  "Photo & Video": {"id": "26", "path": ["Gadgets", "Photo & Video"], "pathIds": ["21", "26"]},
  "Portable Devices": {"id": "28", "path": ["Gadgets", "Portable Devices"], "pathIds": ["21", "28"]},
  "Video Games": {"id": "100", "path": ["Gadgets", "Video Games"], "pathIds": ["21", "100"]},
  "Virtual Reality": {"id": "140", "path": ["Gadgets", "Virtual Reality"], "pathIds": ["21", "140"]},
  "Other Gadgets": {"id": "43", "path": ["Gadgets", "Other Gadgets"], "pathIds": ["21", "43"]},
  "Healthcare": {"id": "87", "path": ["Healthcare"], "pathIds": ["87"], "disabled": true},
  "Home Medical Tools": {"id": "88", "path": ["Healthcare", "Home Medical Tools"], "pathIds": ["87", "88"]},
  "Medical Tools": {"id": "99", "path": ["Healthcare", "Medical Tools"], "pathIds": ["87", "99"]},
  "Hobby & Makers": {"id": "48", "path": ["Hobby & Makers"], "pathIds": ["48"], "disabled": true},
  "Automotive": {"id": "89", "path": ["Hobby & Makers", "Automotive"], "pathIds": ["48", "89"]},
  "Electronics": {"id": "52", "path": ["Hobby & Makers", "Electronics"], "pathIds": ["48", "52"]},
  "Mechanical Parts": {"id": "51", "path": ["Hobby & Makers", "Mechanical Parts"], "pathIds": ["48", "51"]},
  "Music": {"id": "95", "path": ["Hobby & Makers", "Music"], "pathIds": ["48", "95"]},
  "Organizers": {"id": "50", "path": ["Hobby & Makers", "Organizers"], "pathIds": ["48", "50"]},
  "RC & Robotics": {"id": "64", "path": ["Hobby & Makers", "RC & Robotics"], "pathIds": ["48", "64"]},
  "Tools": {"id": "49", "path": ["Hobby & Makers", "Tools"], "pathIds": ["48", "49"]},
  "Other Ideas": {"id": "82", "path": ["Hobby & Makers", "Other Ideas"], "pathIds": ["48", "82"]},
  "Household": {"id": "3", "path": ["Household"], "pathIds": ["3"], "disabled": true},
  "Bathroom": {"id": "5", "path": ["Household", "Bathroom"], "pathIds": ["3", "5"]},
  "Bedroom": {"id": "6", "path": ["Household", "Bedroom"], "pathIds": ["3", "6"]},
  "Garage": {"id": "139", "path": ["Household", "Garage"], "pathIds": ["3", "139"]},
  "Home Decor": {"id": "44", "path": ["Household", "Home Decor"], "pathIds": ["3", "44"]},
  "Kitchen": {"id": "4", "path": ["Household", "Kitchen"], "pathIds": ["3", "4"]},
  "Living Room": {"id": "7", "path": ["Household", "Living Room"], "pathIds": ["3", "7"]},
  "Office": {"id": "29", "path": ["Household", "Office"], "pathIds": ["3", "29"]},
  "Outdoor & Garden": {"id": "53", "path": ["Household", "Outdoor & Garden"], "pathIds": ["3", "53"]},
  "Other House Equipment": {"id": "45", "path": ["Household", "Other House Equipment"], "pathIds": ["3", "45"]},
  "Pets": {"id": "57", "path": ["Household", "Pets"], "pathIds": ["3", "57"]},
  "Learning": {"id": "90", "path": ["Learning"], "pathIds": ["90"], "disabled": true},
  "Chemistry & Biology": {"id": "92", "path": ["Learning", "Chemistry & Biology"], "pathIds": ["90", "92"]},
  "Engineering": {"id": "93", "path": ["Learning", "Engineering"], "pathIds": ["90", "93"]},
  "Haptic Models": {"id": "98", "path": ["Learning", "Haptic Models"], "pathIds": ["90", "98"]},
  "Math": {"id": "94", "path": ["Learning", "Math"], "pathIds": ["90", "94"]},
  "Other 3D Objects for Learning": {"id": "96", "path": ["Learning", "Other 3D Objects for Learning"], "pathIds": ["90", "96"]},
  "Physics & Astronomy": {"id": "91", "path": ["Learning", "Physics & Astronomy"], "pathIds": ["90", "91"]},
  "Seasonal designs": {"id": "65", "path": ["Seasonal designs"], "pathIds": ["65"], "disabled": true},
  "Autumn & Halloween": {"id": "69", "path": ["Seasonal designs", "Autumn & Halloween"], "pathIds": ["65", "69"]},
  "Spring & Easter": {"id": "68", "path": ["Seasonal designs", "Spring & Easter"], "pathIds": ["65", "68"]},
  "Summer": {"id": "71", "path": ["Seasonal designs", "Summer"], "pathIds": ["65", "71"]},
  "Winter & Christmas & New Year's": {"id": "70", "path": ["Seasonal designs", "Winter & Christmas & New Year's"], "pathIds": ["65", "70"]},
  "Sports & Outdoor": {"id": "9", "path": ["Sports & Outdoor"], "pathIds": ["9"], "disabled": true},
  "Indoor Sports": {"id": "84", "path": ["Sports & Outdoor", "Indoor Sports"], "pathIds": ["9", "84"]},
  "Other Sports": {"id": "85", "path": ["Sports & Outdoor", "Other Sports"], "pathIds": ["9", "85"]},
  "Outdoor Sports": {"id": "83", "path": ["Sports & Outdoor", "Outdoor Sports"], "pathIds": ["9", "83"]},
  "Winter Sports": {"id": "74", "path": ["Sports & Outdoor", "Winter Sports"], "pathIds": ["9", "74"]},
  "Tabletop Miniatures": {"id": "101", "path": ["Tabletop Miniatures"], "pathIds": ["101"], "disabled": true},
  "Characters & Monsters": {"id": "97", "path": ["Tabletop Miniatures", "Characters & Monsters"], "pathIds": ["101", "97"]},
  "Miniature Gaming Accessories": {"id": "104", "path": ["Tabletop Miniatures", "Miniature Gaming Accessories"], "pathIds": ["101", "104"]},
  "Props & Terrains": {"id": "103", "path": ["Tabletop Miniatures", "Props & Terrains"], "pathIds": ["101", "103"]},
  "Vehicles & Machines": {"id": "105", "path": ["Tabletop Miniatures", "Vehicles & Machines"], "pathIds": ["101", "105"]},
  "Toys & Games": {"id": "30", "path": ["Toys & Games"], "pathIds": ["30"], "disabled": true},
  "Action Figures & Statues": {"id": "36", "path": ["Toys & Games", "Action Figures & Statues"], "pathIds": ["30", "36"]},
  "Board Games": {"id": "31", "path": ["Toys & Games", "Board Games"], "pathIds": ["30", "31"]},
  "Building Toys": {"id": "37", "path": ["Toys & Games", "Building Toys"], "pathIds": ["30", "37"]},
  "Outdoor Toys": {"id": "34", "path": ["Toys & Games", "Outdoor Toys"], "pathIds": ["30", "34"]},
  "Puzzles & Brain-teasers": {"id": "33", "path": ["Toys & Games", "Puzzles & Brain-teasers"], "pathIds": ["30", "33"]},
  "Vehicles": {"id": "38", "path": ["Toys & Games", "Vehicles"], "pathIds": ["30", "38"]},
  "Other Toys & Games": {"id": "47", "path": ["Toys & Games", "Other Toys & Games"], "pathIds": ["30", "47"]},
  "World & Scans": {"id": "58", "path": ["World & Scans"], "pathIds": ["58"], "disabled": true},
  "Animals": {"id": "61", "path": ["World & Scans", "Animals"], "pathIds": ["58", "61"]},
  "Architecture & Urbanism": {"id": "62", "path": ["World & Scans", "Architecture & Urbanism"], "pathIds": ["58", "62"]},
  "Historical Context": {"id": "75", "path": ["World & Scans", "Historical Context"], "pathIds": ["58", "75"]},
  "People": {"id": "60", "path": ["World & Scans", "People"], "pathIds": ["58", "60"]}
}

export const printablesLicenses = {
  'CC0': {'name': 'Creative Commons — Public Domain', 'id': '7'},
  'CC-BY': {'name': 'Creative Commons — Attribution', 'id': '1'},
  'CC-BY-SA': {'name': 'Creative Commons — Attribution  — Share Alike', 'id': '2'},
  'CC-BY-ND': {'name': 'Creative Commons — Attribution — NoDerivatives', 'id': '8'},
  'CC-BY-NC': {'name': 'Creative Commons — Attribution  — Noncommercial', 'id': '3'},
  'CC-BY-NC-SA': {'name': 'Creative Commons — Attribution  — Noncommercial  —  Share Alike', 'id': '4'},
  'CC-BY-NC-ND': {'name': 'Creative Commons — Attribution  — Noncommercial  —  NoDerivatives', 'id': '6'},
  'GPL 2.0': {'name': 'GNU General Public License v2.0', 'id': '9'},
  'GPL 3.0': {'name': 'GNU General Public License v3.0', 'id': '12'},
  'LGPL': {'name': 'GNU Lesser General Public License', 'id': '10'},
  'BSD': {'name': 'BSD License', 'id': '11'},
  'Standard Digital File': {'name': 'Standard Digital File License', 'id': '13'},
  'Comm. - No Derivative': {'name': 'Commercial Use - No Derivative', 'id': '14'},
  'Commercial Use': {'name': 'Commercial Use', 'id': '15'}
};

export function printablesIsLicenseSupported(licenseAbbreviation) {
  return licenseAbbreviation in printablesLicenses;
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

const queryPollFileUploads = `
query PollFileUploads($ids: [ID!]!) {
  fileUploads: modelFileUploads(ids: $ids) {
    id
    notInspectedFiles
    isUploadFinished
    isProcessed
    gcodes {
      ...GcodeDetail
      __typename
    }
    stls {
      ...StlDetail
      __typename
    }
    slas {
      ...SlaDetail
      __typename
    }
    otherFiles {
      ...OtherFileDetail
      __typename
    }
    images {
      ...ModelImage
      order
      __typename
    }
    __typename
  }
}
fragment GcodeDetail on GCodeType {
  id
  created
  name
  folder
  note
  printer {
    id
    name
    __typename
  }
  excludeFromTotalSum
  printDuration
  layerHeight
  nozzleDiameter
  material {
    id
    name
    __typename
  }
  weight
  fileSize
  filePreviewPath
  rawDataPrinter
  order
  __typename
}
fragment ModelImage on PrintImageType {
  id
  filePath
  rotation
  __typename
}
fragment OtherFileDetail on OtherFileType {
  id
  created
  name
  folder
  note
  fileSize
  filePreviewPath
  order
  __typename
}
fragment SlaDetail on SLAType {
  id
  created
  name
  folder
  note
  expTime
  firstExpTime
  printer {
    id
    name
    __typename
  }
  printDuration
  layerHeight
  usedMaterial
  fileSize
  filePreviewPath
  order
  __typename
}
fragment StlDetail on STLType {
  id
  created
  name
  folder
  note
  fileSize
  filePreviewPath
  order
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
    log.info(`PrintablesAPI: GraphQL request: ${query.substring(0, 40)} ${JSON.stringify(variables)}`);
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
      "id": modelId,
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
    const {description, draft, id, name, remixDescription, summary, tags, category: rawCategory, license: rawLicense, ...otherModelData} = modelData;
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
      "category": printablesCategories[rawCategory]?.id || null,
      "license": printablesLicenses[rawLicense]?.id || null,
      ...otherModelData
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
    if (!response) {
      throw new Error('Failed to create model');
    }
    if (response.errors?.length > 0) {
      throw new Error(`Failed to create model: ${JSON.stringify(response.errors)}`);
    }
    if (!response.data?.modelUpdate?.ok) {
      throw new Error(`Failed to create model: ${JSON.stringify(response)}`);
    }
    return response.data.modelUpdate.output;
  }

  async updateModel(updates) {
    if (!updates.id) {
      throw new Error('Model ID is required for update');
    }
    const {id, description, draft: rawDraft, name, summary, tags, category: rawCategory, license: rawLicense, slas, gcodes, stls, otherFiles, images, ...otherModelData} = updates;
    const current = await this.getModelById(id);
    const updatedModel = {
      id,
      tags: tags || current.tags,
      description: description || current.description,
      category: printablesCategories[rawCategory]?.id || current.category?.id,
      license: printablesLicenses[rawLicense]?.id || current.license?.id,
      name: name || current.name,
      draft: rawDraft === false ? false : rawDraft === true ? true : current.datePublished === null,
      summary: summary || current.summary,
      slas: slas || current.slas,
      gcodes: gcodes || current.gcodes,
      stls: stls || current.stls,
      otherFiles: otherFiles || current.otherFiles,
      images: images || current.images,
      printer: current.printer,
      variationOf: current.variationOf,
      mainImage: current.mainImage,
      remixParents: current.remixParents,
      nsfw: current.nsfw,
      aiGenerated: current.aiGenerated,
      authorship: current.authorship,
      remixDescription: current.remixDescription,
      club: current.club,
      price: current.price,
      excludeCommercialUsage: current.excludeCommercialUsage,
      ...otherModelData,
    };

    const response = await this.graphql(mutationCreateOrUpdateModel, updatedModel);
    if (!response) {
      throw new Error('Failed to update model');
    }
    if (response.errors?.length > 0) {
      throw new Error(`Failed to update model: ${JSON.stringify(response.errors)}`);
    }
    if (!response.data?.modelUpdate?.ok) {
      throw new Error(`Failed to update model: ${JSON.stringify(response)}`);
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
    if (!prepareResponse) {
      throw new Error('Failed to prepare image upload');
    }
    if (prepareResponse.errors?.length > 0) {
      throw new Error(`Failed to prepare image upload: ${JSON.stringify(prepareResponse.errors)}`);
    }
    if (!prepareResponse.data?.upload?.ok) {
      throw new Error(`Failed to prepare image upload: ${JSON.stringify(prepareResponse)}`);
    }
    const uploadData = prepareResponse.data.upload.uploadData;

    // Step 2: Upload the file to the storage provider
    const formData = new FormData();
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
    if (!finalizeResponse) {
      throw new Error('Failed to finalize image upload');
    }
    if (finalizeResponse.errors?.length > 0) {
      throw new Error(`Failed to finalize image upload: ${JSON.stringify(finalizeResponse.errors)}`);
    }
    if (!finalizeResponse.data?.uploadFinished?.ok) {
      throw new Error(`Failed to finalize image upload: ${JSON.stringify(finalizeResponse)}`);
    }
    return finalizeResponse.data.uploadFinished.output;
  }

  async pollFileUploads(ids) {
    const response = await this.graphql(queryPollFileUploads, {ids: ids});
    if (!response) {
      throw new Error('Failed to poll file uploads');
    }
    if (response.errors?.length > 0) {
      throw new Error(`Failed to poll file uploads: ${JSON.stringify(response.errors)}`);
    }
    if (!response.data?.fileUploads) {
      throw new Error('Failed to poll file uploads: no data');
    }
    return response.data.fileUploads;
  }

  // Note: Published is just `draft` set to false, use `updateModel`
  // async publishModel(modelId) {}
}