import {
    IS_FAVORITED,
    IS_NOT_FAVORITED,
} from '../actions/FavoritedAction'

export function favoritedTracker(state = {}, action) {
    switch(action.type) {
        case IS_FAVORITED:
            return Object.assign({}, state, {
                isFavorited: action.payload['isFavorited'],
            });
        case IS_NOT_FAVORITED:
            return Object.assign({}, state, {
                isFavorited: action.payload['isFavorited'],
            });
        default:
            return state;
    }
}
