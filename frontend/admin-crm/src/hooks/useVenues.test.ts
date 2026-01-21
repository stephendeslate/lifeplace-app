// frontend/admin-crm/src/hooks/useVenues.test.ts

import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useVenues, useVenueBlockedDates, usePackageVenues } from './useVenues'
import { createTestWrapper } from '../test/utils/render'
import { server } from '../test/mocks/server'
import { http, HttpResponse } from 'msw'

describe('useVenues', () => {
  describe('Query Operations', () => {
    it('fetches venues successfully', async () => {
      const { result } = renderHook(() => useVenues(), {
        wrapper: createTestWrapper(),
      })

      expect(result.current.isLoadingVenues).toBe(true)

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.venues.length).toBeGreaterThan(0)
      expect(result.current.venues[0]).toHaveProperty('name')
      expect(result.current.venues[0]).toHaveProperty('capacity')
    })

    it('filters by active status', async () => {
      const { result } = renderHook(() => useVenues({ is_active: true }), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      result.current.venues.forEach((venue) => {
        expect(venue.is_active).toBe(true)
      })
    })

    it('filters by search term', async () => {
      const { result } = renderHook(() => useVenues({ search: 'ballroom' }), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      if (result.current.venues.length > 0) {
        result.current.venues.forEach((venue) => {
          const hasMatch =
            venue.name.toLowerCase().includes('ballroom') ||
            venue.description?.toLowerCase().includes('ballroom')
          expect(hasMatch).toBe(true)
        })
      }
    })

    it('handles API error gracefully', async () => {
      server.use(
        http.get('http://localhost:8000/api/venues/venues/', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useVenues(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.venuesError).toBeTruthy()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Nested Hooks', () => {
    it('fetches single venue by ID', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: singleResult } = renderHook(() => result.current.useVenue(1), {
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

    it('fetches all venues', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: allResult } = renderHook(() => result.current.useAllVenues(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(allResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(allResult.current.data).toBeDefined()
      expect(allResult.current.data?.length).toBeGreaterThan(0)
    })

    it('fetches active venues', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      const { result: activeResult } = renderHook(() => result.current.useActiveVenues(), {
        wrapper,
      })

      await waitFor(
        () => {
          expect(activeResult.current.isLoading).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(activeResult.current.data).toBeDefined()
      activeResult.current.data?.forEach((venue) => {
        expect(venue.is_active).toBe(true)
      })
    })
  })

  describe('Mutation Operations', () => {
    it('creates a new venue', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.venues.length

      act(() => {
        result.current.createVenue({
          data: {
            name: 'New Venue',
            description: 'A new test venue',
            capacity: 200,
            base_price: 4000,
          },
        })
      })

      await waitFor(
        () => {
          expect(result.current.isCreatingVenue).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchVenues()
      })

      await waitFor(
        () => {
          expect(result.current.venues.length).toBe(initialCount + 1)
        },
        { timeout: 5000 }
      )
    })

    it('updates a venue', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      const venueToUpdate = result.current.venues[0]

      act(() => {
        result.current.updateVenue({
          id: venueToUpdate.id,
          data: { name: 'Updated Venue Name' },
        })
      })

      await waitFor(
        () => {
          expect(result.current.isUpdatingVenue).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.updateError).toBeFalsy()
    })

    it('deletes a venue', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.venues.length
      const venueToDelete = result.current.venues[result.current.venues.length - 1]

      act(() => {
        result.current.deleteVenue(venueToDelete.id)
      })

      await waitFor(
        () => {
          expect(result.current.isDeletingVenue).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchVenues()
      })

      await waitFor(
        () => {
          expect(result.current.venues.length).toBe(initialCount - 1)
        },
        { timeout: 5000 }
      )
    })
  })
})

describe('useVenueBlockedDates', () => {
  describe('Query Operations', () => {
    it('fetches blocked dates successfully', async () => {
      const { result } = renderHook(() => useVenueBlockedDates(1), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.isLoadingBlockedDates).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.blockedDates).toBeDefined()
      expect(Array.isArray(result.current.blockedDates)).toBe(true)
    })
  })

  describe('Mutation Operations', () => {
    it('creates a blocked date', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenueBlockedDates(1), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingBlockedDates).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.blockedDates.length

      act(() => {
        result.current.createBlockedDate({
          venue: 1,
          start_date: '2025-01-01',
          end_date: '2025-01-02',
          reason: 'New Year Holiday',
        })
      })

      await waitFor(
        () => {
          expect(result.current.isCreatingBlockedDate).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchBlockedDates()
      })

      await waitFor(
        () => {
          expect(result.current.blockedDates.length).toBe(initialCount + 1)
        },
        { timeout: 5000 }
      )
    })

    it('deletes a blocked date', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => useVenueBlockedDates(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingBlockedDates).toBe(false)
        },
        { timeout: 5000 }
      )

      if (result.current.blockedDates.length > 0) {
        const initialCount = result.current.blockedDates.length
        const dateToDelete = result.current.blockedDates[0]

        act(() => {
          result.current.deleteBlockedDate(dateToDelete.id)
        })

        await waitFor(
          () => {
            expect(result.current.isDeletingBlockedDate).toBe(false)
          },
          { timeout: 5000 }
        )

        await act(async () => {
          await result.current.refetchBlockedDates()
        })

        await waitFor(
          () => {
            expect(result.current.blockedDates.length).toBe(initialCount - 1)
          },
          { timeout: 5000 }
        )
      }
    })
  })
})

describe('usePackageVenues', () => {
  describe('Query Operations', () => {
    it('fetches package venues successfully', async () => {
      const { result } = renderHook(() => usePackageVenues(), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.isLoadingPackageVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      expect(result.current.packageVenues).toBeDefined()
      expect(Array.isArray(result.current.packageVenues)).toBe(true)
    })

    it('filters by package ID', async () => {
      const { result } = renderHook(() => usePackageVenues({ package_id: 1 }), {
        wrapper: createTestWrapper(),
      })

      await waitFor(
        () => {
          expect(result.current.isLoadingPackageVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      result.current.packageVenues.forEach((pv) => {
        expect(pv.package).toBe(1)
      })
    })
  })

  describe('Mutation Operations', () => {
    it('creates a package venue assignment', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => usePackageVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingPackageVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      const initialCount = result.current.packageVenues.length

      act(() => {
        result.current.createPackageVenue({
          package: 2,
          venue: 2,
          is_primary: false,
          is_default: false,
        })
      })

      await waitFor(
        () => {
          expect(result.current.isCreatingPackageVenue).toBe(false)
        },
        { timeout: 5000 }
      )

      await act(async () => {
        await result.current.refetchPackageVenues()
      })

      await waitFor(
        () => {
          expect(result.current.packageVenues.length).toBe(initialCount + 1)
        },
        { timeout: 5000 }
      )
    })

    it('deletes a package venue assignment', async () => {
      const wrapper = createTestWrapper()
      const { result } = renderHook(() => usePackageVenues(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoadingPackageVenues).toBe(false)
        },
        { timeout: 5000 }
      )

      if (result.current.packageVenues.length > 0) {
        const initialCount = result.current.packageVenues.length
        const pvToDelete = result.current.packageVenues[0]

        act(() => {
          result.current.deletePackageVenue(pvToDelete.id)
        })

        await waitFor(
          () => {
            expect(result.current.isDeletingPackageVenue).toBe(false)
          },
          { timeout: 5000 }
        )

        await act(async () => {
          await result.current.refetchPackageVenues()
        })

        await waitFor(
          () => {
            expect(result.current.packageVenues.length).toBe(initialCount - 1)
          },
          { timeout: 5000 }
        )
      }
    })
  })
})
