export const CLEAR_GROCERY_LIST = "CLEAR_GROCERY_LIST";
export const ADD_GROCERY_LIST = "ADD_GROCERY_LIST";

import firebase from 'react-native-firebase';

/**
 * groceryListsRef Firestore collection reference to all grocery lists.
 */
const groceryListsRef = firebase.firestore().collection("grocerylists");
const ingredientsRef = firebase.firestore().collection("standardmappings");

/**
 * beginGroceryListsFetch Creates a listener that updates the current user's
 * grocery list as updates are made to it.
 * @param {string} userid The ID of the currently logged in user
 */
export const beginGroceryListFetch = (userid) => async dispatch => {
    groceryListsRef.doc(userid).onSnapshot(groceryListSnapshot => {
        groceryListSnapshot.ref.collection(
            "ingredients"
        ).onSnapshot(snapshot => {
            var index;
            for (index = 0; index < snapshot.docs.length; index++) {
                if (index == 0) {
                    dispatch({
                        type: CLEAR_GROCERY_LIST
                    });
                }
                var amount = snapshot.docs[index].get("amount");
                var title = snapshot.docs[index].id;
                var callback = ((amount, title) => (ingredientSnapshot) => {
                    dispatch({
                        type: ADD_GROCERY_LIST,
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

export const addGroceryListItem = (name, amount, userid) => {
    groceryListsRef.doc(userid).get().then(groceryListSnapshot => {
        groceryListSnapshot.ref.collection(
            "ingredients"
        ).doc(name.toLowerCase()).get().then(docSnap => {
            if (docSnap.exists) {
                groceryListSnapshot.ref.collection("ingredients").doc(name.toLowerCase()).set({amount: amount + docSnap.get("amount")});
            } else {
                groceryListSnapshot.ref.collection("ingredients").doc(name.toLowerCase()).set({amount: amount});
            }
        });
    });
}

export const removeGroceryListItem = (name, userid) => {
    groceryListsRef.doc(userid).get().then(groceryListSnapshot => {
        groceryListSnapshot.ref.collection("ingredients").doc(name.toLowerCase()).delete();
    });
}

export const editGroceryItem = (name, amount, userid) => {
    groceryListsRef.doc(userid).get().then(groceryListSnapshot => {
        groceryListSnapshot.ref.collection(
            "ingredients"
        ).doc(name.toLowerCase()).set({amount: amount});
    });
}