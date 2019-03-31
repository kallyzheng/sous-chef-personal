""" 
This module scrapes recipe information from allrecipes.com.
"""
import json
import uuid
import time
import requests
from bs4 import BeautifulSoup

import utils

def getTitle(htmlDocument):
    """ Parse BeautifulSoup html and return title of the recipe. """
    title = None
    try:
        titleHdrAttrs = {"class": "recipe-summary__h1"}
        title = htmlDocument.find("h1", titleHdrAttrs).next
    except:
        title = str(htmlDocument.find("title"))
        title = title.replace(' - Allrecipes.com</title>', '')
        title = title.replace('<title>', '')
    # may need to deal with linguini vs linguine? or genoese vs genoise
    title = title.replace('\u00ae', '')
    return title.strip()
    
def getIngredients(htmlDocument):
    """ Parse BS object and return dict of ingredient information. """
    ingredients = []
    ingredientSpanAttrs = {"itemprop": "recipeIngredient"}
    htmlLines = htmlDocument.findAll("span", ingredientSpanAttrs)
    for htmlLine in htmlLines:
        ingredient = utils.parseIngredientInfo(htmlLine.next)
        if ingredient is not None:
            ingredients.append(ingredient)
    return ingredients

def getDirections(htmlDocument):
    """ Parse BS object and return ordered list of recipe directions. """
    directionSpanAttrs = {"class": "recipe-directions__list--item"}
    directionSpan = htmlDocument.find_all("span", directionSpanAttrs)
    directions = []
    for direction in directionSpan:
        direction = utils.cleanString(direction.text)
        if direction != "":
            directions.append(direction)
    return directions

def getImage(htmlDocument):
    """ Parse BS Object and return string linking to recipe image. """
    imageSpanAttrs = {"class": "rec-photo"}
    imageSpan = htmlDocument.find("img", imageSpanAttrs)
    if imageSpan == None:
        return ''
    imageUrl = imageSpan["src"]
    if imageUrl == 'https://images.media-allrecipes.com/images/79591.png':
        return ''
    return imageUrl

def getServingSize(htmlDocument):
    """ Parse BS Object and return serving size of recipe as integer. """
    servingSpan = htmlDocument.find("div", class_="subtext")
    return utils.parseServings(servingSpan.next)

def getCookingTime(htmlDocument):
    """ Parse BS Object and return dict of cooking time information. """
    timeSpan = htmlDocument.find("span", class_="ready-in-time")
    hour, minute = utils.parseTime(timeSpan.next)
    timeInfo = {
        "hour": hour,
        "minute": minute
    }
    return timeInfo

def getRatingInfo(htmlDocument):
    valueAttr = {"itemprop": "ratingValue"}
    valueLine = htmlDocument.find("meta", valueAttr)
    countAttr = {"itemprop": "reviewCount"}
    countLine = htmlDocument.find("meta", countAttr)
    ratingInfo = {
        "rating": valueLine["content"],
        "reviewCount": countLine["content"],
    }
    return ratingInfo

def getRecipeCategories(htmlDocument):
    categoriesAttr = {"itemprop": "recipeCategory"}
    recipeCategories = htmlDocument.findAll("meta", categoriesAttr)
    categories = []
    for recipeCategoryLine in recipeCategories:
        categories.append(recipeCategoryLine["content"])
    return categories


def scrapeWebsite(htmlDocument):
    """ Parse BS Object of the given url and return dict of recipe info. """
    title = getTitle(htmlDocument)
    if "File Not Found" in title:
        return None
    recipeInfo = {
        "id": str(uuid.uuid4()),
        "title" : title,
        "ingredients": getIngredients(htmlDocument),
        "directions": getDirections(htmlDocument),
        "images": getImage(htmlDocument),
        "servings": getServingSize(htmlDocument),
        "time": getCookingTime(htmlDocument),
        "rating": getRatingInfo(htmlDocument),
        "categories": getRecipeCategories(htmlDocument),
    }
    return recipeInfo

# scrapeWebsite('./temp.json')