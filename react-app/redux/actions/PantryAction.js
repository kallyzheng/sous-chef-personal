export const CLEAR_PANTRY = "CLEAR_PANTRY";
export const ADD_PANTRY = "ADD_PANTRY";
export const ADD_NEW_PANTRY_ITEM = "ADD_NEW_PANTRY_ITEM";
export const SET_INGREDIENTS_TO_REMOVE = "SET_INGREDIENTS_TO_REMOVE";

import firebase from 'react-native-firebase';

/**
 * pantryRef Firestore collection reference to all pantry lists.
 */
const pantryRef = firebase.firestore().collection("pantrylists");
const ingredientsRef = firebase.firestore().collection("standardmappings");
const ingredientsIDLookupRef = firebase.firestore().collection("ingredientToID");

/**
 * beginPantryFetch Creates a listener that updates the current user's
 * pantry list as updates are made to it.
 * @param {string} userid The ID of the currently logged in user
 */
export const beginPantryFetch = (userid) => async dispatch => {
    pantryRef.doc(userid).onSnapshot(pantryListSnapshot => {
        pantryListSnapshot.ref.collection(
            "ingredients"
        ).onSnapshot(snapshot => {
            var index;
            for (index = 0; index < snapshot.docs.length; index++) {
                if (index == 0) {
                    dispatch({
                        type: CLEAR_PANTRY
                    });
                }
                var amount = snapshot.docs[index].get("amount");
                var title = snapshot.docs[index].id;
                var callback = ((amount, title) => (ingredientSnapshot) => {
                    dispatch({
                        type: ADD_PANTRY,
                        payload: {
                            title: title,
                            amount: amount,
                            unit: ingredientSnapshot.get("unit")
                        }
                    });
                })(amount, title);

                ingredientsRef.doc(
                    snapshot.docs[index].id
                ).get().then(callback);
            }
        })
    })
}

export const addPantryItem = (name, amount, userid) => {
    pantryRef.doc(userid).get().then(pantrySnapshot => {
        pantrySnapshot.ref.collection(
            "ingredients"
        ).doc(name.toLowerCase()).get().then(docSnap => {
            if (docSnap.exists) {
                pantrySnapshot.ref.collection("ingredients").doc(name.toLowerCase()).set({amount: amount + docSnap.get("amount")});
            } else {
                pantrySnapshot.ref.collection("ingredients").doc(name.toLowerCase()).set({amount: amount});
            }
        });
    })
}

export const removePantryItem = (name, userid) => {
    pantryRef.doc(userid).get().then(pantrySnapshot => {
        pantrySnapshot.ref.collection("ingredients").doc(name.toLowerCase()).delete();
    });
}

export const editPantryItem = (name, amount, userid) => {
    pantryRef.doc(userid).get().then(pantrySnapshot => {
        pantrySnapshot.ref.collection(
            "ingredients"
        ).doc(name.toLowerCase()).set({amount: amount});
    });
}

export const removeFromPantry = (userID, ingredients) => {
    Object.keys(ingredients).map((ingredientIdx) => {
        console.log(ingredients[ingredientIdx])
        const ingredientInfo = ingredients[ingredientIdx][0]
        const surplus = ingredients[ingredientIdx][1]
        const ingredient = ingredientInfo['ingredient']
        if (surplus <= 0) {
            pantryRef.doc(userID).collection('ingredients').doc(ingredient)
                .delete().catch(function(error) {
                    console.error("Error removing document: ", error);
                });
        } else {
            pantryRef.doc(userID).collection('ingredients').doc(ingredient)
                .update({
                    amount: surplus
                })
        }
    });
}

