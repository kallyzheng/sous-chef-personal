export const CLEAR_READY_TO_GO = "CLEAR_READY_TO_GO";
export const READY_TO_GO_ADD = "READY_TO_GO_ADD";

export const CLEAR_RECOMMENDED = "CLEAR_RECOMMENDED";
export const ADD_RECOMMENDED = "ADD_RECOMMENDED";

export const CLEAR_RECENT = "CLEAR_RECENT";
export const ADD_RECENT = "ADD_RECENT";

export const SET_INGREDIENTS_TO_REMOVE = "SET_INGREDIENTS_TO_REMOVE";

export const IS_NOT_FAVORITED = "IS_NOT_FAVORITED";
export const IS_FAVORITED = "IS_FAVORITED";
export const FLIP_FAVORITED = "FLIP_FAVORITED";

import firebase from 'react-native-firebase';

/**
 * recipesRef Reference to the all recipes collection in firestore.
 */
const recipesRef = firebase.firestore().collection('test_recipes');

/**
 * relevantRecipesRef Collection reference to the relevant recipes collection
 * in firestore.
 */
const relevantRecipesRef = firebase.firestore().collection('relevantrecipes');

/**
 * relevantRecipeUpdate is a general purpose thunk that given a snapshot from
 * relevantrecipes collection in firestore, will check if that snapshot has
 * recipes that have recipeFieldToCheck field set to true, and then grabbing
 * the respective recipes from the recipe collection and updating the store.
 *
 * @param {string} recipeFieldToCheck The field inside the relevant recipes
 * document to check against to see if the recipe is a match for the desired
 * category.
 * @param {function} dispatch dispatch function for redux
 * @param {string} clear_type The clear action type for the desired category
 * in redux.
 * @param {string} add_type The add action type for the desired category in
 * redux.
 */
const relevantRecipeUpdate = (
    recipeFieldToCheck,
    dispatch,
    clear_type,
    add_type
) => snapshot => {
    snapshot.ref.collection("recipes").onSnapshot(snapshot => {
        var index;
        var firstRecipeThrough = true;
        for (index = 0; index < snapshot.docs.length; ++index) {
            var fieldValue = snapshot.docs[index].get(recipeFieldToCheck);
            if (fieldValue == undefined || !fieldValue) {
                continue;
            }
            var callback = ((firstRecipeThrough) => (snapshot) => {
                if (firstRecipeThrough) {
                    dispatch({
                        type: clear_type
                    });
                }
                dispatch({
                    type: add_type,
                    payload: {
                        images: snapshot.docs[0].get("images"),
                        servings: snapshot.docs[0].get("servings"),
                        timeHour: snapshot.docs[0].get("time.hour"),
                        timeMinute: snapshot.docs[0].get("time.minute"),
                        title: snapshot.docs[0].get("title"),
                        recipeID: snapshot.docs[0].get("id"),
                        id: snapshot.docs[0].id
                    }
                });
            })(firstRecipeThrough);
            recipesRef.where(
                "id",
                "=",
                snapshot.docs[index].get("recipeID")
            ).get().then(callback);
            firstRecipeThrough = false;
        }
        if (firstRecipeThrough) {
            dispatch({
                type: clear_type
            });
        }
    })
}

/**
 * beginReadyToGo function that listens on ready to go recipes
 * to get the recipes that a user has all of the ingredients for.
 */
export const beginReadyToGoFetch = (userID) => async dispatch => {
    relevantRecipesRef.doc(userID).onSnapshot(
        relevantRecipeUpdate(
            "isReadyToGo", dispatch, CLEAR_READY_TO_GO, READY_TO_GO_ADD
        )
    );
}

/**
 * beginRecommendedRecipesFetch function that listens on recommended recipe
 * collection to get live updates on the users recommendations.
 */
export const beginRecommendedRecipesFetch = (userID) => async dispatch => {
    relevantRecipesRef.doc(userID).onSnapshot(
        relevantRecipeUpdate(
            "isRecommended", dispatch, CLEAR_RECOMMENDED, ADD_RECOMMENDED
        )
    );
}

/**
 * Retrieves data related to previewing a recipe.
 * Note: This is not a redux function.
 * @param {string} id The recipe id.
 */
export function beginRecipePreviewFetch(id) {
    var results = {};

    recipesRef.doc(id).get().then(function(doc) {
        results = {
            ...doc.data()
        };
    })
    .catch(function(error) {
        console.log("Error getting documents: ", error);
    });

    return results;
}

/**
 * beginRecentRecipesFetch function that listens on recent recipe
 * collection to get the recipes that a user has interacted with recently.
 */
export const beginRecentRecipesFetch = (userID) => async dispatch => {
    relevantRecipesRef.doc(userID).onSnapshot(
        relevantRecipeUpdate(
            "isRecent", dispatch, CLEAR_RECENT, ADD_RECENT
        )
    );
}

export const getIsFavorited = (userID, recipeID) => {
    return (dispatch) => {
        var recipeDocRef = relevantRecipesRef.doc(userID)
            .collection('recipes').doc(recipeID)

        recipeDocRef.get().then(doc => {
            if (!doc.exists) {
                dispatch({
                    type: IS_NOT_FAVORITED,
                    payload: {
                        isFavorited: false,
                    }
                })
            } else {
                var data = doc.data()
                if ('isFavorited' in data && data['isFavorited']) {
                    return dispatch({
                        type: IS_FAVORITED,
                        payload: {
                            isFavorited: true,
                        }
                    })
                } else {
                    return dispatch({
                        type: IS_NOT_FAVORITED,
                        payload: {
                            isFavorited: false,
                        }
                    })
                }
            }
        }).catch(err => {
            console.log('Error getting document', err);
        });
    }
}

export const flipIsFavorited = (isFavorited) => {
    return (dispatch) => {
        return dispatch({
            type: FLIP_FAVORITED,
            payload: {
                isFavorited: !isFavorited
            }
        })
    }
}

export const addRatingForRecipe = (recipeID, rating, userID) => {
    recipesRef.doc(recipeID).get().then(recipeSnapshot => {
        var oldRating = parseFloat(recipeSnapshot.get("rating.rating"));
        var ratingCount = parseInt(recipeSnapshot.get("rating.reviewCount"));
        var newRating = ((oldRating * ratingCount) + rating) / (ratingCount + 1);
        recipesRef.doc(recipeID).set({rating: newRating, ratingCount: ratingCount + 1}, {merge: true});
    });
    relevantRecipesRef.doc(userID).collection("recipes").doc(recipeID).set(
        {rating: rating},
        {merge: true}
    );
}
