import firebase_admin
from firebase_admin import credentials, firestore
import os, json 
import uuid
import time
import re
import csv
from collections import Counter

cred = credentials.Certificate('./serviceaccountkey.json')
default_app = firebase_admin.initialize_app(cred)

db = firestore.client()

def parseIngrText(text):
    ingredientText = re.search("([ \d/]+)([^\d/]+.*)",text.lower()).group(2)
    ingredientText = ingredientText.replace("/", "\\")
    return ingredientText.strip()

def saveIngredientLines():
    allText = Counter()
    filePath = './recipes/'
    for recipe_file in os.listdir(filePath):
        if recipe_file.endswith('.json'):
            with open(filePath + recipe_file) as f:
                data = json.load(f)
                ingredientInfos = data['ingredients']
                for ingredientInfo in ingredientInfos:
                    quantity = ingredientInfo['quantity']
                    originaltext = parseIngrText(ingredientInfo['originaltext'])
                    allText[ingredientText] += 1

    with open ('ingredientline.csv', mode='w') as csv_file:
        fieldnames = ['ingredient_line', 'n_occurances']
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)

        writer.writeheader()
        for line_item in allText:
            writer.writerow({
                'ingredient_line': line_item,
                'n_occurances': allText[line_item],
            })

def readCSVToDict(fileName):
    mapping = {}
    with open(fileName, mode='r') as f:
        reader = csv.reader(f)
        headerRow = next(reader)
        descriptionIdx = headerRow.index('ingredient_line')
        ingredientIdx = headerRow.index('main_ingredient')
        standardUnitIdx = headerRow.index('standardUnit')
        standardConversionIdx = headerRow.index('1 standard unit is?')
        for row in reader:
            description = row[descriptionIdx]
            if description[0] == '"':
                description = description[1:-1]
            if description == '':
                continue
            mapping[description.strip()] = {
                'ingredient': row[ingredientIdx].strip(),
                'standardUnit': row[standardUnitIdx].strip(),
                'standardTo': float(row[standardConversionIdx])
            }
    return mapping

def getStandardizableRecipes():
    mapping = readCSVToDict('./ingredientline_updated.csv')
    filePath = './recipes/'
    for recipe_file in os.listdir(filePath):
        if not recipe_file.endswith('.json'):
            continue
        missingLines = []
        with open(filePath + recipe_file) as f:
            data = json.load(f)
            ingredients = {}
            ingredientInfos = data['ingredients']
            for ingredientInfo in ingredientInfos:
                quantity = ingredientInfo['quantity']
                originaltext = parseIngrText(ingredientInfo['originaltext'])
                if originaltext not in mapping:
                    missingLines.append(originaltext)
                else:
                    mappingInfo = mapping[originaltext]
                    standardQuantity = quantity / mappingInfo['standardTo']
                    ingredients[mappingInfo['ingredient']] = {
                        'standardQuantity': standardQuantity,
                        'originalQuantity': quantity,
                        'originalText': originaltext,
                    }

            if len(missingLines) == 0:
                data['ingredients'] = ingredients
                categories = []
                for category in data['categories']:
                    categories.append(category.lower())
                data['categories'] = categories

                doc_ref = db.collection(u'test_recipes').document(data['id'])
                doc_ref.set(data)
                print(recipe_file)

# getStandardizableRecipes()

def getMappingConversions():
    mapping = readCSVToDict('./ingredientline_updated.csv')
    ingredientMapping = {}
    for originalText in mapping:
        ingredient = mapping[originalText]['ingredient']
        standardUnit = mapping[originalText]['standardUnit']
        standardTo = mapping[originalText]['standardTo']
        if ingredient not in ingredientMapping:
            ingredientMapping[ingredient] = {
                'unit': standardUnit,
                'standardTo': {}
            }

        ### Check if there are inconsistent mapping values
        if ingredientMapping[ingredient]['unit'] != standardUnit:
            print(originalText, ingredient)
            print(ingredientMapping[ingredient]['unit'], standardUnit)
            print('')
            
        ingredientMapping[ingredient]['standardTo'][originalText] = standardTo
    
    # print(ingredientMapping)
    for ingredient in ingredientMapping:
        print(ingredient)
        doc_ref = db.collection(u'standardmappings').document(ingredient)
        doc_ref.set(ingredientMapping[ingredient])

# getMappingConversions()