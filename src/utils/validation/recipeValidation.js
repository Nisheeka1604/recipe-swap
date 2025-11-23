// Validates a recipe object
export function validateRecipe(recipe) {
  const errors = [];

  // Title validation
  if (!recipe.title || recipe.title.trim() === "") {
    errors.push("Title is required");
  } else if (recipe.title.length < 3) {
    errors.push("Title must be at least 3 characters");
  }

  // Ingredients validation
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    errors.push("At least one ingredient is required");
  } else {
    recipe.ingredients.forEach((ing, idx) => {
      if (!ing.name || ing.name.trim() === "") {
        errors.push(`Ingredient #${idx + 1} must have a name`);
      }
      if (!ing.quantity || ing.quantity.trim() === "") {
        errors.push(`Ingredient #${idx + 1} must have a quantity`);
      }
    });
  }

  // Instructions validation
  if (!recipe.instructions || recipe.instructions.trim() === "") {
    errors.push("Instructions cannot be empty");
  } else if (recipe.instructions.length < 10) {
    errors.push("Instructions must be at least 10 characters long");
  }

  // Optional: validate cooking time if provided
  if (recipe.cookingTime) {
    if (isNaN(recipe.cookingTime) || recipe.cookingTime <= 0) {
      errors.push("Cooking time must be a positive number");
    }
  }

  return errors; // empty array = no errors
}
