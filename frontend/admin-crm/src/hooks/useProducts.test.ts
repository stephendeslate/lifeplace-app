// frontend/admin-crm/src/hooks/useProducts.test.ts

import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useProducts, useProductCategories, useDiscounts } from './useProducts'
import { createTestWrapper } from '../test/utils/render'
import { server } from '../test/mocks/server'
import { http, HttpResponse } from 'msw'

describe('useProductCategories', () => {
  describe('Query Operations', () => {
    it('fetches categories successfully', async () => {
      const { result } = renderHook(() => useProductCategories(), {
        wrapper: createTestWrapper(),
      })

      expect(result.current.isLoadingCategories).toBe(true)

      await waitFor(
        () => {
          expect(result.current.isLoadingCategories).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.categories.length).toBeGreaterThan(0)
      expect(result.current.categories[0]).toHaveProperty('name')
    })

    it('handles API error gracefully', async () => {
      server.use(
        http.get('http://localhost:8000/api/products/categories/all/', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useProductCategories(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.categoriesError).toBeTruthy()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Nested Hooks', () => {
    it('fetches categories tree', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProductCategories(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingCategories).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: treeResult } = renderHook(() => result.current.useCategoriesTree(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(treeResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(treeResult.current.data).toBeDefined()
    })

    it('fetches root categories', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProductCategories(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingCategories).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: rootResult } = renderHook(() => result.current.useRootCategories(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(rootResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(rootResult.current.data).toBeDefined()
      rootResult.current.data?.forEach((cat) => {
        expect(cat.parent).toBeNull()
      })
    })

    it('fetches single category by ID', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProductCategories(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingCategories).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: singleResult } = renderHook(() => result.current.useCategory(1), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(singleResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(singleResult.current.data).toBeDefined()
      expect(singleResult.current.data?.id).toBe(1)
    })
  })

  describe('Mutation Operations', () => {
    it('creates a new category', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProductCategories(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingCategories).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.categories.length

      act(() => {
        result.current.createCategory({
          name: 'New Category',
          description: 'A new category',
        })
      })

      await waitFor(
        () => {
          expect(result.current.isCreatingCategory).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchCategories()
      })

      await waitFor(
        () => {
          expect(result.current.categories.length).toBe(initialCount + 1)
        },
        { timeout: 5000 }
      )
    })

    it('updates a category', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProductCategories(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingCategories).toBe(false)
        },
        { timeout: 5000 }
      )

      const categoryToUpdate = result.current.categories[0]

      act(() => {
        result.current.updateCategory({
          id: categoryToUpdate.id,
          data: { name: 'Updated Category' },
        })
      })

      await waitFor(
        () => {
          expect(result.current.isUpdatingCategory).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.updateError).toBeFalsy()
    })

    it('deletes a category', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProductCategories(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingCategories).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.categories.length

      // Delete the last category (less likely to have dependencies)
      const categoryToDelete = result.current.categories[result.current.categories.length - 1]

      act(() => {
        result.current.deleteCategory(categoryToDelete.id)
      })

      await waitFor(
        () => {
          expect(result.current.isDeletingCategory).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchCategories()
      })

      await waitFor(
        () => {
          expect(result.current.categories.length).toBe(initialCount - 1)
        },
        { timeout: 5000 }
      )
    })
  })
})

describe('useProducts', () => {
  describe('Query Operations', () => {
    it('fetches products successfully', async () => {
      const { result } = renderHook(() => useProducts(), {
        wrapper: createTestWrapper(),
      })

      expect(result.current.isLoadingProducts).toBe(true)

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.products.length).toBeGreaterThan(0)
      expect(result.current.products[0]).toHaveProperty('name')
      expect(result.current.products[0]).toHaveProperty('base_price')
    })

    it('filters by category', async () => {
      const { result } = renderHook(() => useProducts({ category_id: 1 }), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      result.current.products.forEach((product) => {
        expect(product.category).toBe(1)
      })
    })

    it('handles API error gracefully', async () => {
      server.use(
        http.get('http://localhost:8000/api/products/products/all/', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useProducts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.productsError).toBeTruthy()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Nested Hooks', () => {
    it('fetches single product by ID', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: singleResult } = renderHook(() => result.current.useProduct(1), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(singleResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(singleResult.current.data).toBeDefined()
      expect(singleResult.current.data?.id).toBe(1)
    })

    it('fetches products only (no packages)', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: productsResult } = renderHook(() => result.current.useProductsOnly(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(productsResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(productsResult.current.data).toBeDefined()
      productsResult.current.data?.forEach((p) => {
        expect(p.is_package).toBe(false)
      })
    })

    it('fetches packages only', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: packagesResult } = renderHook(() => result.current.usePackagesOnly(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(packagesResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(packagesResult.current.data).toBeDefined()
      packagesResult.current.data?.forEach((p) => {
        expect(p.is_package).toBe(true)
      })
    })

    it('fetches active products', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: activeResult } = renderHook(() => result.current.useActiveProducts(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(activeResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(activeResult.current.data).toBeDefined()
      activeResult.current.data?.forEach((p) => {
        expect(p.is_active).toBe(true)
      })
    })

    it('fetches featured products', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: featuredResult } = renderHook(() => result.current.useFeaturedProducts(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(featuredResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(featuredResult.current.data).toBeDefined()
      featuredResult.current.data?.forEach((p) => {
        expect(p.is_featured).toBe(true)
      })
    })
  })

  describe('Mutation Operations', () => {
    it('creates a new product', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.products.length

      act(() => {
        result.current.createProduct({
          data: {
            name: 'New Product',
            description: 'A new product',
            category: 1,
            base_price: 1000,
            currency: 'USD',
          },
        })
      })

      await waitFor(
        () => {
          expect(result.current.isCreatingProduct).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchProducts()
      })

      await waitFor(
        () => {
          expect(result.current.products.length).toBe(initialCount + 1)
        },
        { timeout: 5000 }
      )
    })

    it('updates a product', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const productToUpdate = result.current.products[0]

      act(() => {
        result.current.updateProduct({
          id: productToUpdate.id,
          data: { name: 'Updated Product Name' },
        })
      })

      await waitFor(
        () => {
          expect(result.current.isUpdatingProduct).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.updateError).toBeFalsy()
    })

    it('deletes a product', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useProducts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingProducts).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.products.length
      const productToDelete = result.current.products[0]

      act(() => {
        result.current.deleteProduct(productToDelete.id)
      })

      await waitFor(
        () => {
          expect(result.current.isDeletingProduct).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchProducts()
      })

      await waitFor(
        () => {
          expect(result.current.products.length).toBe(initialCount - 1)
        },
        { timeout: 5000 }
      )
    })
  })
})

describe('useDiscounts', () => {
  describe('Query Operations', () => {
    it('fetches discounts successfully', async () => {
      const { result } = renderHook(() => useDiscounts(), {
        wrapper: createTestWrapper(),
      })

      expect(result.current.isLoadingDiscounts).toBe(true)

      await waitFor(
        () => {
          expect(result.current.isLoadingDiscounts).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.discounts.length).toBeGreaterThan(0)
      expect(result.current.discounts[0]).toHaveProperty('name')
      expect(result.current.discounts[0]).toHaveProperty('code')
    })

    it('handles API error gracefully', async () => {
      server.use(
        http.get('http://localhost:8000/api/products/discounts/all/', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useDiscounts(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.discountsError).toBeTruthy()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Nested Hooks', () => {
    it('fetches valid discounts', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useDiscounts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingDiscounts).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: validResult } = renderHook(() => result.current.useValidDiscounts(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(validResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(validResult.current.data).toBeDefined()
    })
  })

  describe('Mutation Operations', () => {
    it('creates a new discount', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useDiscounts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingDiscounts).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.discounts.length

      act(() => {
        result.current.createDiscount({
          name: 'New Discount',
          code: 'NEW25',
          discount_type: 'PERCENTAGE',
          value: 25,
        })
      })

      await waitFor(
        () => {
          expect(result.current.isCreatingDiscount).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchDiscounts()
      })

      await waitFor(
        () => {
          expect(result.current.discounts.length).toBe(initialCount + 1)
        },
        { timeout: 5000 }
      )
    })

    it('deletes a discount', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useDiscounts(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingDiscounts).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.discounts.length
      const discountToDelete = result.current.discounts[0]

      act(() => {
        result.current.deleteDiscount(discountToDelete.id)
      })

      await waitFor(
        () => {
          expect(result.current.isDeletingDiscount).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchDiscounts()
      })

      await waitFor(
        () => {
          expect(result.current.discounts.length).toBe(initialCount - 1)
        },
        { timeout: 5000 }
      )
    })
  })
})
