# Database Architecture
This documents describes the data layout of our tables in Firebase. This document should be updated if the data in Firebase will be restructured.

**Bold objects are collections.** 
*Italicized ojbects are fields.*

## users
This table stores all IDs associated with a particular user along with the user's email address.<br/>
Document1 is indexed by **_userID_**.

| Document1 | Document1.data |
| --------- | -------------- |
| 'userID'  |  *email: 'exampleEmail@stanford.edu'*<br/>*groceryListID: 'gID'*<br/> *pantryListID: 'pID'* <br/> *relevantRecipesID: 'rrID'* <br/> *userID: 'userID'* |

## relevantrecipes 
This table stores information about which recipes are to be associated with a specific user.<br/>
Document1 is indexed by **_userID_**.
Document2 is indexed by **_recipeID_**.

| Document1 | Document1.data | Document2 | Document2.data |
| --------- | -------------- | --------- | ---------------|
| 'userID'  | *userID: 'exampleID'* | | |
| | **recipes**| 'recipeID' | *recipeID: 'rID'*<br/> *isReadyToGo: true* <br/> *isRecent: 'true'*|
| | | 'recipeID2' | *recipeID: 'rID2'*<br/> *isReadyToGo: true* <br/> *isRecommended: 'false'*|


## recipes
This table stores the information relevant to a specific ingredient. <br/>
Document1 is indexed by **_recipeID_**.

| Document1   | Document1.data |
| ----------- | -------------- |
| 'recipeID'  | *title: 'warm milk'*<br/>*directions: ['put milk in cup', 'microwave cup']*  <br/>*id: 'recipeID'* <br/>*images: 'image.jpeg'* <br/>*ingredients: {*<br/> *&emsp;'milk': {*<br/>*&emsp;&emsp;originalQuantity: 2*<br/>*&emsp;&emsp;originalText: 'cups of cold milk'*<br/>*&emsp;&emsp;standardQuantity: 2*<br/>&emsp;} <br/>}<br/>*categories: ['Drink', 'Dairy']*<br/>*rating:* {<br/>&emsp;*rating: 4.05* <br/> &emsp;*reviewCount: 23*<br/>}<br/>*time: {*<br/>&emsp;*hour: 0*<br/> &emsp;*minute: 5*<br/>} |

## groceryLists / pantryLists
These tables store information about which ingredients are stored in each user's lists.<br/>
Document1 is indexed by **_userID_**.
Document2 is indexed by **_ingredientID_**.

| Document1 | Document1.data | Document2 | Document2.data |
| --------- | -------------- | --------- | -------------- |
| 'userID'  | *userID: 'exampleID'* | | |
| | **ingredients** | 'egg' | *amount: 2* |
| | | 'sugar' | *amount: '30.5'* |

## standardmappings 
This table maps ingredientID (aka ingredient Name) to the accepted
standard unit. This ingredient also lists conversions to the standard
unit. <br/>
Document1 is indexed by **_ingredientID_**.

| Document1 | Document1.data |
| --------- | -------------- |
| 'egg'     | *unit: 'whole'* <br/>*standardTo: {*<br/>&emsp;*half-eggs: 2,*<br/>&emsp;*whole egg boiled and peeled: 1,*<br/>} |
| 'milk'    | *unit: 'cup'*<br/>*standardTo: {*<br/>&emsp;*glass of milk: 1,*<br/>&emsp;*teaspoon of milk: 0.02083*<br/>} | 

