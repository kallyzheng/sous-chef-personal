import firebase from 'react-native-firebase';
import uuid4 from 'uuid';

export const LOGIN_SUCCESS = "LOGIN_SUCCESS"
export const LOGIN_FAILURE = "LOGIN_FAILURE"
export const LOGOUT = "LOGOUT"

const usersRef = firebase.firestore().collection('users');
const pantryRef = firebase.firestore().collection('pantrylists');
const groceryRef = firebase.firestore().collection('grocerylists');
const relevantRecipesRef = firebase.firestore().collection('relevantrecipes');

/**
 * createUser is a function that given an email and a password,
 * will either create a user acouunt in firebase and will also generate
 * the relevant collections in Firebase and the IDs to be associated 
 * with the user. 
 * 
 * @param {string} email: user's email address
 * @param {string} password: user's password
 */
export const createUser = (email, password) => {
    return (dispatch) => {
        firebase.auth()
            .createUserWithEmailAndPassword(email, password)
            .then(() => signInSuccess(
                dispatch, 
                firebase.auth().currentUser.uid, 
                email
            ))
            .catch(error => authenticationFailure(dispatch, error.message, email));
    }
}

/**
 * signInUser is a function that given an email and a password,
 * will set the user to be the current user in firebase and will retreive
 * the IDs associated with this user from Firebase.
 * 
 * @param {string} email: user's email address
 * @param {string} password: user's password
 */
export const loginUser = (email, password) => {
    return (dispatch) => {
        firebase.auth()
            .signInWithEmailAndPassword(email, password)
            .then(() => loginSuccess(
                dispatch,
                firebase.auth().currentUser.uid,
                email
            ))
            .catch(error => authenticationFailure(dispatch, error.message, email));
    }
}

/**
 * loginExisting is a function that checks if a user is already logged into the
 * app and sets the redux state to contain the logged in user's information.
 */
export const loginExistingUser = () => {
    return (dispatch) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                loginSuccess(
                    dispatch,
                    user.uid,
                    user.email
                )
            }
         });
    }
}

/**
 * logoutUser is a function that logs out the current user.
 */
export const logoutUser = () => {
    return (dispatch) => {
        firebase.auth().signOut()
        dispatch({
            type: LOGOUT
        })
    }
}

/**
 * loginSuccess retrieves information about the current user from Firebase 
 * and dispatches a redux action to update all IDs associated with the 
 * user in store.
 * 
 * @param {function} dispatch: dispatch function for redux
 * @param {string} userID: the userID of the user in question
 * @param {boolean} email: the email of the user in question
 */
export const loginSuccess = (dispatch, userID, email) => {
    usersRef.where("userID", "=", userID).onSnapshot(
        function(doc) {
            if (!(doc.docs.length == 1)) {
                console.warn('Error: multiple users with same user id')
            }
            const userInfo = doc.docs[0].data()
            dispatch({
                type: LOGIN_SUCCESS,
                payload: userInfo
            })
        }
    );
}

/**
 * signInSuccess creates unique IDs that will be associated with a
 * particular user and creates necessary documents in Firebase to
 * store these new IDs.
 * 
 * @param {function} dispatch: dispatch function for redux
 * @param {string} userID: the userID of the user in question
 * @param {email} email: the email of the user in question
 */
export const signInSuccess = (dispatch, userID, email) => {
    const groceryListID = uuid4();
    const pantryListID = uuid4();
    const relevantRecipesID = uuid4();
    
    const userInfo = {
        userID: userID,
        email: email,
        groceryListID: groceryListID,
        pantryListID: pantryListID,
        relevantRecipesID: relevantRecipesID,
    }

    // create documents necessary for new users in firebase
    usersRef.doc(userID).set(userInfo)
    relevantRecipesRef.doc(userID).set({
        relevantRecipesID: relevantRecipesID
    })

    // load dummy data to test with
    relevantRecipesRef.doc(userID)
        .collection('recipes').doc('2198f390-582a-4462-b62f-f6dbba7165c0').set({
            recipeID: '2198f390-582a-4462-b62f-f6dbba7165c0',
            isReadyToGo: true,
            isRecommended: true
        })

    pantryRef.doc(userID).set({
        pantryListID: pantryListID
    }) 

    // prepopulate pantry with staple pantry items
    prepopulatePantry(userID)

    groceryRef.doc(userID).set({
        groceryListID: groceryListID
    }) 

    dispatch({
        type: LOGIN_SUCCESS,
        payload: userInfo
    });
}

this.commonPantryItems = {
    "butter": 1,             // 2 sticks = 1 cup of butter
    "salt": 20,              // 3/4 pound = 20 tablespoons
    "black pepper": 34,      // 1 canister = 34 teaspoons
    "white sugar": 73,       // 2 pound bag = 73 tablespoons
    "all-purpose flour": 6,  // 2 pound bag = 6 cups
    "olive oil": 96,         // 16 ounce bottle = 96 teaspoons
    "vegetable oil": 64,     // 1 quart = 64 tablespoons
    "egg": 12,               // 1 dozen = 12 whole
    "garlic": 5,             // 5 cloves
    "milk": 12,              // under 1 gallon = 12 cups
};

/**
 * prepopulatePantry adds common pantry items into a user's pantry.
 * 
 * @param {string} userID: user whose pantry we want to prepopulate.
 */
function prepopulatePantry(userID) {
    Object.keys(commonPantryItems).forEach(function(key) {
        pantryRef.doc(userID).collection('ingredients').doc(key).set({
            amount: commonPantryItems[key]
        })
    });
}

/**
 * authenticationFailure is a function that dispatches the authentication
 * error to the redux store.
 * 
 * @param {function} dispatch: dispatch function for redux
 * @param {string} errorMessage: message describing the error
 * @param {string} email: the email of the user in question
 */
function authenticationFailure(dispatch, errorMessage, email) {
    dispatch({
        type: LOGIN_FAILURE,
        payload: errorMessage,
        email: email
    });
}