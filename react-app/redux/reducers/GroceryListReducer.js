import { CLEAR_GROCERY_LIST, ADD_GROCERY_LIST } from '../actions/GroceryListAction';

export function groceryList(state = [], action) {
    switch(action.type) {
        case CLEAR_GROCERY_LIST:
            return [];
        case ADD_GROCERY_LIST:
            var newArr = [...state];
            newArr.push(action.payload);
            return newArr;
        default:
            return state;
    }
}