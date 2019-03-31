import { CLEAR_PANTRY, ADD_PANTRY, SET_INGREDIENTS_TO_REMOVE } from '../actions/PantryAction';

export function pantry(state = [], action) {
    switch(action.type) {
        case CLEAR_PANTRY:
            return [];
        case ADD_PANTRY:
            var newArr = [...state];
            newArr.push(action.payload);
            return newArr;
        default:
            return state;
    }
}

/**
* Reducer for Finished Lifecycle to apply actions to the store
* @param {array} state The current store state for userId
* @param {object} action The action to apply to the store
*/
export function itemsToRemove(state = {}, action) {
    switch(action.type) {
      case SET_INGREDIENTS_TO_REMOVE:
      return Object.assign({}, state, {
        ingredientsToRemove: action.payload,
      });
      default:
      return state
    }
  }