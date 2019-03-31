
export const IS_NOT_FAVORITED = "IS_NOT_FAVORITED";
export const IS_FAVORITED = "IS_FAVORITED";

import firebase from 'react-native-firebase';

const relevantRecipesRef = firebase.firestore().collection('relevantrecipes');

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

export const saveIsFavorited = (userID, recipeID, isFavorited) => {
    var recipeDocRef = relevantRecipesRef.doc(userID)
        .collection('recipes').doc(recipeID)
    recipeDocRef.update({
        isFavorited: isFavorited
    })
}

export const saveIsRecent = (userID, recipeID) => {
    var recipeDocRef = relevantRecipesRef.doc(userID)
        .collection('recipes').doc(recipeID)
    recipeDocRef.update({
        isRecent: true,
        lastAccessed: new Date(),
    })
}