# Image Management Implementation Plan

**Created:** 2025-01-05
**Status:** Ready for Implementation
**Priority:** P1 (Pre-Production)

---

## Executive Summary

This document outlines the complete implementation plan for image management across the LifePlace platform, covering:
1. Backend media file configuration
2. Mobile-app field naming unification
3. Local fallback image assets
4. Admin-CRM image upload UI
5. Package image inheritance from venues

---

## Current State Analysis

### What Exists

| Component | Image Support | Status |
|-----------|---------------|--------|
| **Backend Venue Model** | `featured_image` (ImageField), `gallery_images` (JSONField) | Fields exist, no storage configured |
| **Backend Product Model** | None | No image fields |
| **Backend Serializers** | Expose `featured_image`, `gallery_images` | Working |
| **Admin-CRM Venue Form** | No image fields | Form exists, no upload UI |
| **Admin-CRM Product Form** | No image fields | Form exists, no upload UI |
| **Mobile-App Explore** | Uses `featured_image` | Working |
| **Mobile-App Booking** | Uses `featured_image_url` | Inconsistent naming |
| **Mobile-App Fallbacks** | External placehold.co | Works but external dependency |

### What's Missing

1. **Backend:** `MEDIA_URL` and `MEDIA_ROOT` configuration
2. **Backend:** Image fields on ProductOption model
3. **Admin-CRM:** ImageUploadField component
4. **Admin-CRM:** GalleryUploadField component
5. **Admin-CRM:** Venue form image section
6. **Mobile-App:** Field naming consistency
7. **Mobile-App:** Local fallback assets

---

## Phase 1: Quick Fixes (Estimated: 2-4 hours)

### 1.1 Backend Media Configuration

**File:** `backend/core/settings.py`

Add after line 189 (after STATIC_ROOT):

```python
# Media files (uploaded images)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
```

**File:** `backend/core/urls.py`

Add at the end:

```python
from django.conf import settings
from django.conf.urls.static import static

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

**Create directory:**
```bash
mkdir -p backend/media/venues/images
```

---

### 1.2 Mobile-App Field Naming Fix

**Files to modify:**

#### 1. `src/types/booking/venues.types.ts` (line 33)

```typescript
// BEFORE:
featured_image_url?: string;

// AFTER:
featured_image?: string;
```

#### 2. `src/types/booking/stepData.types.ts` (lines 82, 107, 296)

```typescript
// BEFORE (all 3 occurrences):
featured_image_url?: string;

// AFTER:
featured_image?: string;
```

#### 3. `src/apis/booking/venues.api.ts` (line 33)

```typescript
// BEFORE:
featured_image_url?: string;

// AFTER:
featured_image?: string;
```

#### 4. `src/components/booking/steps/VenueSelectionStep.tsx` (lines 255, 278, 280)

```typescript
// BEFORE (line 255):
const {
  // ...
  featured_image_url,
  // ...
} = venue;

// AFTER:
const {
  // ...
  featured_image,
  // ...
} = venue;

// BEFORE (line 278):
{featured_image_url ? (

// AFTER:
{featured_image ? (

// BEFORE (line 280):
source={{ uri: featured_image_url }}

// AFTER:
source={{ uri: featured_image }}
```

---

### 1.3 Local Fallback Image Asset

**Required asset:**

| File | Dimensions | Purpose |
|------|------------|---------|
| `assets/placeholder.png` | 300x146 | Single placeholder for all fallback scenarios |

**How size mismatches are handled:**
- `expo-image` uses `contentFit="cover"` throughout the app
- This crops the image to fill the container while maintaining aspect ratio
- The 300x146 (~2:1) image will be cropped when displayed in:
  - Cards (4:3 ratio) → crops top/bottom
  - Avatars (1:1 ratio) → crops sides
  - Gallery views → crops as needed
- Note: May appear slightly soft on large screens due to upscaling

**Update `src/constants/images.ts`:**

```typescript
/**
 * Image Constants
 *
 * Centralized fallback and placeholder images.
 * Using local bundled asset for offline support.
 */

/**
 * Single branded placeholder image for all fallback scenarios.
 * Bundled locally for reliability and offline access.
 */
const PLACEHOLDER_IMAGE = require('@assets/placeholder.png');

/**
 * Fallback images for when content images are unavailable.
 * All point to the same branded placeholder for consistency.
 */
export const FALLBACK_IMAGES = {
  venue: PLACEHOLDER_IMAGE,
  package: PLACEHOLDER_IMAGE,
  event: PLACEHOLDER_IMAGE,
  avatar: PLACEHOLDER_IMAGE,
  generic: PLACEHOLDER_IMAGE,
} as const;

/**
 * Image sizing configurations
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 100, height: 100 },
  card: { width: 400, height: 300 },
  gallery: { width: 800, height: 600 },
  fullscreen: { width: 1200, height: 900 },
} as const;

export default FALLBACK_IMAGES;
```

**Update `tsconfig.json` paths (if not already configured):**

```json
{
  "compilerOptions": {
    "paths": {
      "@assets/*": ["./assets/*"]
    }
  }
}
```

---

## Phase 2: Admin-CRM Image Upload (Estimated: 8-12 hours)

### 2.1 Create ImageUploadField Component

**File:** `frontend/admin-crm/src/components/common/ImageUploadField.tsx`

**Features:**
- Single image upload
- Drag-and-drop support
- Image preview with aspect ratio
- File validation (type, size)
- Clear/delete button
- Loading state
- Error display

**Props Interface:**
```typescript
interface ImageUploadFieldProps {
  value: string | File | null;
  onChange: (file: File | null) => void;
  label?: string;
  helperText?: string;
  error?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  aspectRatio?: number;
  disabled?: boolean;
}
```

---

### 2.2 Create GalleryUploadField Component

**File:** `frontend/admin-crm/src/components/common/GalleryUploadField.tsx`

**Features:**
- Multiple image upload
- Drag-and-drop reordering (react-beautiful-dnd or similar)
- Thumbnail grid preview
- Individual delete buttons
- Add more button
- Maximum image count limit

**Props Interface:**
```typescript
interface GalleryUploadFieldProps {
  value: (string | File)[];
  onChange: (files: (string | File)[]) => void;
  label?: string;
  helperText?: string;
  maxImages?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}
```

---

### 2.3 Update Venue Form Dialog

**File:** `frontend/admin-crm/src/components/venues/VenueFormDialog.tsx`

**Add new Accordion section after "Basic Information":**

```tsx
{/* Images */}
<Accordion
  expanded={expandedSections.includes('images')}
  onChange={() => toggleSection('images')}
>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">Images</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <Stack spacing={3}>
      <ImageUploadField
        label="Featured Image"
        value={formData.featured_image}
        onChange={(file) => handleImageChange('featured_image', file)}
        helperText="Main image shown in listings and cards. Recommended: 800x600px"
        maxSizeMB={5}
        aspectRatio={4/3}
      />

      <GalleryUploadField
        label="Gallery Images"
        value={formData.gallery_images}
        onChange={(files) => handleImageChange('gallery_images', files)}
        helperText="Additional images for venue detail page. Max 10 images."
        maxImages={10}
        maxSizeMB={5}
      />
    </Stack>
  </AccordionDetails>
</Accordion>
```

**Update form data interface:**
```typescript
interface VenueFormData {
  // ... existing fields
  featured_image: File | string | null;
  gallery_images: (File | string)[];
}
```

**Update handleSubmit to use FormData:**
```typescript
const handleSubmit = async () => {
  if (!validateForm()) return;

  const formDataPayload = new FormData();

  // Append all text fields
  formDataPayload.append('name', formData.name);
  // ... other fields

  // Append featured image if it's a File
  if (formData.featured_image instanceof File) {
    formDataPayload.append('featured_image', formData.featured_image);
  }

  // Append gallery images
  formData.gallery_images.forEach((img, index) => {
    if (img instanceof File) {
      formDataPayload.append(`gallery_images_files`, img);
    } else {
      formDataPayload.append(`gallery_images_urls`, img);
    }
  });

  onSubmit(formDataPayload);
};
```

---

### 2.4 Update Venues API

**File:** `frontend/admin-crm/src/apis/venues.api.ts`

**Modify create/update functions to handle FormData:**

```typescript
createVenue: async (data: FormData): Promise<VenueDetail> => {
  const response = await api.post<VenueDetail>('/venues/venues/', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
},

updateVenue: async (id: number, data: FormData): Promise<VenueDetail> => {
  const response = await api.patch<VenueDetail>(`/venues/venues/${id}/`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
},
```

---

## Phase 3: Package Image Support (Estimated: 6-8 hours)

### 3.1 Backend: Add Image Fields to ProductOption

**File:** `backend/core/domains/products/models.py`

Add after line 93 (after `is_featured`):

```python
# Images
featured_image = models.ImageField(
    upload_to='products/images/',
    null=True,
    blank=True,
    help_text="Featured image for product/package listings"
)
gallery_images = models.JSONField(
    default=list,
    blank=True,
    help_text="List of image URLs for product gallery"
)
```

**Create migration:**
```bash
cd backend
python manage.py makemigrations products
python manage.py migrate
```

---

### 3.2 Update Product Serializers

**File:** `backend/core/domains/products/serializers.py`

Add `featured_image` and `gallery_images` to:
- `ProductOptionSerializer`
- `ProductOptionListSerializer`
- `ProductOptionDetailSerializer`
- `PublicProductSerializer`

---

### 3.3 Admin-CRM Product Form

**File:** `frontend/admin-crm/src/components/products/ProductFormDialog.tsx`

Add Images accordion section (same pattern as venues).

---

## Phase 4: Image Inheritance Logic (Estimated: 4-6 hours)

### 4.1 Backend Serializer Enhancement

**File:** `backend/core/domains/products/serializers.py`

Add computed field for inherited image:

```python
class PublicProductSerializer(serializers.ModelSerializer):
    display_image = serializers.SerializerMethodField()

    def get_display_image(self, obj):
        """Get best available image (own or inherited from primary venue)"""
        # First, try own featured image
        if obj.featured_image:
            return obj.featured_image.url

        # For packages, try primary venue's image
        if obj.type == 'PACKAGE':
            primary_venue = obj.package_venues.filter(is_primary=True).first()
            if primary_venue and primary_venue.venue.featured_image:
                return primary_venue.venue.featured_image.url

            # Fall back to first venue
            first_venue = obj.package_venues.first()
            if first_venue and first_venue.venue.featured_image:
                return first_venue.venue.featured_image.url

        return None
```

---

### 4.2 Mobile-App Package Detail Update

**File:** `mobile-app/app/packages/[id].tsx`

Update to use `display_image` or implement client-side fallback logic.

---

## Testing Checklist

### Phase 1 Tests
- [ ] Verify `MEDIA_URL` serves uploaded files in development
- [ ] Confirm field naming change doesn't break booking flow
- [ ] Test local fallback images load correctly
- [ ] Test offline fallback image display

### Phase 2 Tests
- [ ] Upload single image via VenueFormDialog
- [ ] Upload multiple gallery images
- [ ] Verify images persist after save
- [ ] Test image deletion
- [ ] Test image replacement
- [ ] Verify images display in mobile-app

### Phase 3 Tests
- [ ] Upload package featured image
- [ ] Verify package images display in listings
- [ ] Test gallery images on package detail

### Phase 4 Tests
- [ ] Verify package inherits primary venue image when no own image
- [ ] Test fallback to first venue when no primary
- [ ] Confirm own image takes precedence over inherited

---

## File Change Summary

### Backend Changes
| File | Action | Phase |
|------|--------|-------|
| `core/settings.py` | Add MEDIA settings | 1 |
| `core/urls.py` | Add media URL pattern | 1 |
| `domains/products/models.py` | Add image fields | 3 |
| `domains/products/serializers.py` | Add image fields, inheritance | 3, 4 |

### Admin-CRM Changes
| File | Action | Phase |
|------|--------|-------|
| `components/common/ImageUploadField.tsx` | Create new | 2 |
| `components/common/GalleryUploadField.tsx` | Create new | 2 |
| `components/common/index.ts` | Export new components | 2 |
| `components/venues/VenueFormDialog.tsx` | Add Images section | 2 |
| `apis/venues.api.ts` | Support FormData | 2 |
| `components/products/ProductFormDialog.tsx` | Add Images section | 3 |

### Mobile-App Changes
| File | Action | Phase |
|------|--------|-------|
| `src/types/booking/venues.types.ts` | Rename field | 1 |
| `src/types/booking/stepData.types.ts` | Rename field (3x) | 1 |
| `src/apis/booking/venues.api.ts` | Rename field | 1 |
| `src/components/booking/steps/VenueSelectionStep.tsx` | Update references | 1 |
| `src/constants/images.ts` | Use local asset | 1 |
| `assets/placeholder.png` | Add branded image (300x146) | 1 |

---

## Dependencies

### Required npm Packages (Admin-CRM)
```bash
# Already likely installed, verify:
npm list @emotion/react @emotion/styled

# May need for drag-and-drop:
npm install @hello-pangea/dnd
# or
npm install react-beautiful-dnd @types/react-beautiful-dnd
```

### Required Python Packages (Backend)
```bash
# Already installed via Django:
# - Pillow (for ImageField)
# Verify in requirements.txt
```

---

## Production Considerations

### Image Storage (Future)
Current plan uses local filesystem. For production scaling, consider:
- **AWS S3** with django-storages
- **Cloudinary** for CDN + transformations
- **DigitalOcean Spaces** (S3-compatible)

### Image Optimization
Consider adding:
- Automatic resizing on upload
- WebP conversion
- Thumbnail generation
- CDN integration

---

## Related Documentation

- [PRE_PRODUCTION_TODOS.md](PRE_PRODUCTION_TODOS.md) - Add image testing items
- [BOOKING_IMPLEMENTATION.md](BOOKING_IMPLEMENTATION.md) - Update with field naming
- Backend Django documentation for ImageField handling

---

*Generated: 2025-01-05*
