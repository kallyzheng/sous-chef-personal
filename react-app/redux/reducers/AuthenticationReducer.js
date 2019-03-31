import { LOGIN_FAILURE, LOGIN_SUCCESS, LOGOUT } from '../actions/AuthenticationAction'

/**
 * Reducer for userID to apply actions to the store
 * @param {dictionary} state The current store state for userID
 * @param {object} action The action to apply to the store
 */
 export function userInfo(state = {}, action) {
    switch(action.type) {
        case LOGIN_SUCCESS:
            return Object.assign({}, state, {
                errorMessage: '',
                userID: action.payload.userID,
                email: action.payload.email,
                groceryID: action.payload.groceryID,
                pantryID: action.payload.pantryID,
                relevantRecipesID: action.payload.relevantRecipesID,
              });
        case LOGIN_FAILURE:
            return Object.assign({}, state, {
                errorMessage: action.payload,
                userID: '',
                email: action.email,
            });
        case LOGOUT:
            return Object.assign({}, state, {
                errorMessage: '',
                userID: '',
                email: '',
                groceryID: '',
                pantryID: '',
                relevantRecipesID: '',
              });
        default:
            return state;
    }
}