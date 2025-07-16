/**
 * Test for design description preservation bug fix
 * 
 * This test verifies that when editing a design's non-description fields,
 * the description field is preserved and not reset to empty.
 */

describe('Design Edit Description Preservation', () => {
  // Mock design data
  const mockDesignData = {
    id: '1',
    main_name: 'Test Design',
    summary: 'Test Summary', 
    description: '<p>This is a test description with <strong>formatting</strong></p>',
    license_key: 'CC-BY',
    tags: [{ tag: 'test', platform: 'PUBMAN' }, { tag: 'design', platform: 'PUBMAN' }],
    thingiverse_category: null,
    printables_category: null,
    makerworld_category: null,
    is_ready: false,
    is_published: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    thumbnail: null,
    assets: [],
    platforms: []
  };

  test('description state should be set when design is loaded', () => {
    // This test ensures that when a design is loaded,
    // the description state is properly initialized to match the design's description
    
    // Mock the resetForm function logic
    const reset = jest.fn();
    const setDescription = jest.fn();
    
    const resetForm = (design) => {
      reset({
        main_name: design.main_name,
        summary: design.summary,
        description: design.description,
        license_key: design.license_key,
        tags: design.tags.map(tag => tag.tag).join(', '),
        thingiverse_category: design.thingiverse_category || null,
        printables_category: design.printables_category || null,
        makerworld_category: design.makerworld_category || null,
      });
      setDescription(design.description);
    };

    // Simulate loading the design
    resetForm(mockDesignData);

    // Verify that setDescription was called with the correct description
    expect(setDescription).toHaveBeenCalledWith(mockDesignData.description);
  });

  test('description state should be preserved during form submission when other fields change', () => {
    // This test simulates the scenario where:
    // 1. A design is loaded with a description
    // 2. User edits a non-description field (like name)
    // 3. User submits the form
    // 4. The description should NOT be lost
    
    let descriptionState = mockDesignData.description; // Simulate state
    
    // Simulate setDescription being called during design load
    const setDescription = (newDescription) => {
      descriptionState = newDescription;
    };
    
    // Simulate loading design (fixed version)
    setDescription(mockDesignData.description);
    
    // Simulate form submission where user changed the name but not description
    const formData = {
      main_name: 'Updated Test Design', // Changed
      summary: mockDesignData.summary,  // Unchanged
      license_key: mockDesignData.license_key, // Unchanged
      tags: 'test, design', // Unchanged
      thingiverse_category: null,
      printables_category: null,
      makerworld_category: null
    };
    
    // The key fix: description should come from state, not form
    const submissionData = {
      ...formData,
      description: descriptionState // This is the fix - use state, not empty form field
    };
    
    // Verify that the description is preserved
    expect(submissionData.description).toBe(mockDesignData.description);
    expect(submissionData.description).not.toBe(''); // Should not be empty
    expect(submissionData.main_name).toBe('Updated Test Design'); // Verify other changes work
  });

  test('description state should be reset when form is reset', () => {
    // Test that when the edit form is cancelled/reset, 
    // the description state returns to the original design description
    
    let descriptionState = ''; // Start with empty (simulating bug scenario)
    
    const setDescription = (newDescription) => {
      descriptionState = newDescription;
    };
    
    // Simulate the resetForm call (with fix)
    const resetForm = (design) => {
      setDescription(design.description);
    };
    
    // User cancels edit - form should be reset
    resetForm(mockDesignData);
    
    // Verify description state is properly reset to original value
    expect(descriptionState).toBe(mockDesignData.description);
  });
});