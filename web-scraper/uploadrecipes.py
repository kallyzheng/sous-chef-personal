import firebase_admin
from firebase_admin import credentials, firestore
import os, json 
import uuid
import time

cred = credentials.Certificate('./serviceaccountkey.json')
default_app = firebase_admin.initialize_app(cred)

db = firestore.client()

ingredientToID = {}
path_to_json = './recipes/'
for recipe_file in os.listdir(path_to_json):
    if recipe_file.endswith('.json'):
        with open(path_to_json + recipe_file) as f:
            data = json.load(f)
            ingredientInfos = data['ingredients']
            ingredient_dict = {}
            for ingredientInfo in ingredientInfos:
                ingredient = ingredientInfo['ingredient']
                if ingredient not in ingredientToID:
                    ingredient_uuid = str(uuid.uuid4())
                    ingredientToID[ingredient] = ingredient_uuid
                ingredient_dict[ingredientToID[ingredient]] = ingredientInfo
            data['ingredients'] = ingredient_dict
            doc_ref = db.collection(u'recipes').document(data['id'])
            doc_ref.set(data)
    print(recipe_file)
    time.sleep(1)

for ingredient in ingredientToID:
    ingredient_uuid = ingredientToID[ingredient]
    doc_ref = db.collection(u'ingredientToID').document(ingredient)
    doc_ref.set({'id': ingredient_uuid})

    doc_ref = db.collection(u'IDToIngredient').document(ingredient_uuid)
    doc_ref.set({'name': ingredient})
