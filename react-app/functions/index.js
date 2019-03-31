// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// Number of ready-to-go recipes to store for the user
const MAX_NUM_READY_TO_GO = 20;

// Number of recipes to query at a time
const DOCS_PER_PAGE = 50;

// Number of seconds in five minutes
const MS_IN_FIVE_MIN = 1000 * 60 * 5;

/**
 * Firebase collections
 */
const recipes = admin.firestore().collection('test_recipes');
const relevantRecipes = admin.firestore().collection('relevantrecipes');
const pantry = admin.firestore().collection('pantrylists');
const taskData = admin.firestore().collection('taskdata').doc('ReadyToGo');

/**
 * Determines whether a recipe is ready to go.
 * @param {Array} needs Ingredients required by the recipe
 * @param {Array} haves Ingredients the user has
 * @return {bool} Whether the recipe is ready to go.
 */
var isReadyToGo = (needs, haves) => {
	for (var needIndex = 0; needIndex < needs.length; needIndex++) {
		const need = needs[needIndex];

		var haveAny = false;
		for (var haveIndex = 0; haveIndex < haves.length; haveIndex++) {
			const have = haves[haveIndex];

			if (need.ingredient == have.ingredient) {
				haveAny = true;

				if (need.amount > have.amount) {
					// We don't have enough
					return false;
				}

				// Found ingredient in pantry, stop searching
				break;
			}
		}

		if (!haveAny) {
			// Required ingredient not found in pantry
			return false;
		}
	}

	// Search completed without failure
	return true;
}

var markNotRelevant = (irrelevantRecipes) => {
	for (var i = 0; i < irrelevantRecipes.length; i++) {
		irrelevantRecipes[i].update({isReadyToGo: false});
	}
	return irrelevantRecipes.length;
}

/**
 * Deletes any recipes from relevantrecipes that are no longer ready
 * @param {string} userID The user whose list this is
 * @param {Array} ingredients A list of ingredients the user has in pantry.
 * 	Each ingredient must be an object of the form 
 * 	{ingredient: <ingr. id>, amount: <float>}.
 * @return {int} Number of remaining recipes that are ready to go
 */
var filterPrevReadyRecipes = (userID, ingredients) => {
	var numReadyToGo = 0;
	var irrelevantRecipes = [];
	return relevantRecipes.doc(userID).collection('recipes').get()
		.then((querySnapshot) => {
			console.log("Filtering through", querySnapshot.docs.length,
				"existing relevant recipes.");

			var promises = [];
			var relevantRecipes = [];
			var recipeIDs = [];

			querySnapshot.forEach((doc) => {
				var recipeID = doc.id;
				if (recipeID === null || recipeID === undefined || recipeID === "") {
					console.warn(doc.id);
				}
				var promise = recipes.doc(recipeID).get();
				relevantRecipes.push(doc);
				recipeIDs.push(recipeID);
				promises.push(promise);
			});

			return Promise.all(promises).then((docs) => {
				for (var i = 0; i < docs.length; i++) {
	                const recipeDoc = docs[i];
					if (!recipeDoc.exists) {
						console.log("Current relevant recipe " + recipeIDs[i] +
							" not found in recipe DB.");
						continue;
					}
					const recipeData = recipeDoc.data();
					var ingredientsNeeded = [];
					for (var ingredientNeeded in recipeData.ingredients) {
						ingredientsNeeded.push({
							ingredient: ingredientNeeded, 
							amount: recipeData.ingredients[ingredientNeeded].standardQuantity
						})
					}
					if (relevantRecipes[i].data().isReadyToGo &&
						!isReadyToGo(ingredientsNeeded, ingredients)) {
						// We can't make this recipe anymore--remove flag
						irrelevantRecipes.push(relevantRecipes[i].ref);
						console.log("Recipe", recipeDoc.id,
							"can't be made anymore, remove flag.");
					}
					else {
						numReadyToGo++;
					}
				}

				return numReadyToGo;
			});
		}).then((num) => {
			// Mark no longer relevant recipes as such
			markNotRelevant(irrelevantRecipes);
			return num;
		});
}

var retrieveNewRecipes = (self, lastVisible, isEndOfData, userID, ingredients, numReadyToGo) => {
	var page = lastVisible !== undefined ?
		recipes.startAfter(lastVisible).limit(DOCS_PER_PAGE) :
		recipes.limit(DOCS_PER_PAGE);

	console.log("Request for", DOCS_PER_PAGE, "recipes.");

	return page.get().then((querySnapshot) => {
		console.log(querySnapshot.docs.length + " recipe docs retrieved.");
		if (querySnapshot.docs.length == 0) {
			throw "No more docs to retrieve."; // TODO: This seems wrong, we should just return
		}
		// Get the last visible document
		lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

		try {
			querySnapshot.forEach((doc) => {
				const recipe = doc.data();
				const recipeID = recipe.id;
				if (recipeID === null || recipeID === undefined || recipeID === "") {
					console.warn(doc.id);
				}
				var ingredientsNeeded = [];
				for (var ingredientNeeded in recipe.ingredients) {
					ingredientsNeeded.push({
						ingredient: ingredientNeeded, 
						amount: recipe.ingredients[ingredientNeeded].standardQuantity
					})
				}
				if (isReadyToGo(ingredientsNeeded, ingredients)) {
					// We can make this recipe! Add it to our list
					relevantRecipes.doc(userID).collection('recipes')
						.doc(recipeID).set({ isReadyToGo: true, recipeID: recipeID }, {merge: true});
					numReadyToGo++;
					console.log("Recipe", recipeID, "is ready to go!");
				}

				if (numReadyToGo == MAX_NUM_READY_TO_GO) {
					throw "Found " + MAX_NUM_READY_TO_GO + " ready to go!";
				}
			});
		}
		catch (error) {
			console.log(error);
			isEndOfData = true;
			return MAX_NUM_READY_TO_GO;
		}

		return numReadyToGo;
	}).then((num) => {
		if (!isEndOfData) {
			return self(self, lastVisible, false, userID, ingredients, num);
		} else {
			return num;
		}
	});
}

/**
 * Finds new recipes that are ready-to-go and adds them to relevantrecipes
 * @param {string} userID The user whose list this is
 * @param {Object} ingredients A list of ingredients the user has in pantry
 * @param {int} numReadyToGo The number of recipes currently marked ready
 */
var addNewReadyRecipes = (userID, ingredients, numReadyToGo) => {
    // TODO: order recipes to retrieve in any particular way? Cooktime?
	var lastVisible = undefined;
	var isEndOfData = false;
	return retrieveNewRecipes(retrieveNewRecipes, lastVisible, isEndOfData, userID, ingredients, numReadyToGo);
}

var isTooSoon = (taskObject, now) => {
	if (taskObject.lastStarted === undefined) {
		return false;
	}
	if (taskObject.lastEnded === undefined && taskObject.lastStarted !== undefined) {
		return true;
	}
	if (taskObject.lastEnded < taskObject.lastStarted) {
		return true; // Last task has not ended
	}
	if (now < taskObject.lastEnded + MS_IN_FIVE_MIN) {
		return true; // Not long enough since last task ended
	}
	return false;
}

/**
 * Any change to a pantry triggers recalculation of ready-to-go recipes.
 */
exports.updateReadyToGoRecipes = functions.firestore
	.document('pantrylists/{userID}/ingredients/{ingredientID}').onWrite((change, context) => {
		// Read transaction data with the intention of modifying
		return taskData.get().then(doc => {
			var timestamp = Date.now();
			console.log("Pantry write event triggered at time", timestamp);
			// Figure out whether to start job
			var exit = isTooSoon(doc.data(), timestamp);
			if (exit) {
				throw "Too soon to start job.";
			}
			return taskData.update({ "lastStarted": timestamp });
		}).then(() => {
			// Begin job
			const userID = context.params.userID;

			return change.after.ref.parent.get().then((docs) => {
				var updatedIngredients = [];
				docs.forEach((doc) => {
					var data = doc.data();
					data.ingredient = doc.id;
					updatedIngredients.push(data);
				});
				console.log(updatedIngredients.length + " ingredients in pantry.");

				// First filter out any ready-to-go recipes that are no longer ready
				return filterPrevReadyRecipes(userID, updatedIngredients).then((num) => {
					console.log("Filtered through previously ready recipes. Now there are", num, "ready recipes.");

					// Now add other recipes that are ready to go
					return addNewReadyRecipes(userID, updatedIngredients, num).then((num2) => {
						console.log("Added newly ready recipes. Now there are", num2, "ready recipes.");
					});

				}).then(() => {
					// Modify transaction data to update end time
					return admin.firestore().runTransaction((transaction) => {
						return transaction.get(taskData).then((doc) => {
							transaction.update(taskData, { "lastEnded": Date.now() });
						});
					});
				});
			});
		}).catch((error) => {
			console.warn(error);
		});
	});

exports.recommendations = functions.
	firestore.document('relevantrecipes/{userid}/recipes/{recipeID}').onWrite((change, context) => {
		// Get all relevant recipes
		return change.after.ref.parent.get().then(allRelevantSnap => {
			var allRelevantRefs = new Array();
			for (var i = 0; i < allRelevantSnap.docs.length; i++) {
				allRelevantRefs.push(admin.firestore().collection("test_recipes").doc(allRelevantSnap.docs[i].id));
			}
			// Get recipes for all of the relevant recipes
			return Promise.all([admin.firestore().getAll(...allRelevantRefs), new Promise(resolve => {
				resolve(allRelevantSnap);
			})]);
		}).then(recipeData => {
			const allRecipeDocs = recipeData[0];
			const allRelevantSnap = recipeData[1];
			var allRecipeMap = new Map();
			var i = 0;
			// Map from recipe id to recipe data
			for (i = 0; i < allRecipeDocs.length; i++) {
				allRecipeMap[allRecipeDocs[i].id] = allRecipeDocs[i];
			}
			var ratedCategories = new Array();
			var ratedCategoriesMap = new Map();
			for (i = 0; i < allRelevantSnap.docs.length; i++) {
				var currentRecipe = allRelevantSnap.docs[i];
				// Get categories from recipes
				var categories = allRecipeMap[currentRecipe.id].get("categories");
				var currentRecipeRating = currentRecipe.get("rating");
				// Only look at recipes we have rated
				if (currentRecipeRating === undefined) {
					continue;
				}
				// Go through all of the categories on the recipe and compute new rating
				for (var j = 0; j < categories.length; j++) {
					if (ratedCategoriesMap.has(categories[j])) {
						const prevCategory = ratedCategoriesMap.get(categories[j]);
						const newRating =
							(
								(prevCategory.count * prevCategory.averageRating) + currentRecipeRating
							) / (prevCategory.count + 1)
						ratedCategoriesMap.set(categories[j], {count: prevCategory.count, rating: newRating});
					} else {
						ratedCategoriesMap.set(categories[j], {rating: currentRecipeRating, count: 1});
					}
				}
			}
			// Turn map into an array and sort it
			for (var category of ratedCategoriesMap.keys()) {
				ratedCategories.push({category: category, rating: ratedCategoriesMap.get(category).rating});
			}
			ratedCategories.sort(function(categoryA, categoryB) {
				return categoryB.rating - categoryA.rating;
			});

			// Recursively callback and get recipes with highest rated categories until
			// out of rated categories or have found 15 recipes to recommend
			var getRecipesForCategory = (ratedCategories, getMoreRecipes, index, recipesAdded) => {
				return recipes.where("categories", "array-contains", ratedCategories[index].category).get().then(recipesSnap => {
					for (var k = 0; k < recipesSnap.docs.length; k++) {
						recipesAdded.push(recipesSnap.docs[k]);
					}
					if (recipesAdded.length >= 15 || index === ratedCategories.length - 1) {
						for (var j = 0; j < recipesAdded.length; j++) {
							change.after.ref.parent.doc(recipesAdded[j].id).set({isRecommended: true, recipeID: recipesAdded[j].id}, {merge: true});
						}
						return true;
					} else {
						return getMoreRecipes(ratedCategories, getMoreRecipes, index + 1, recipesAdded);
					}
				});
			}
			return getRecipesForCategory(ratedCategories, getRecipesForCategory, 0, new Array());
		});
});
