import re
import wordlabels

FIND_QUANTITY_PATTERN = re.compile(r"(\d+( \d+/\d+)?|(\d+/\d+))")
FIND_HOUR_PATTERN = re.compile(r"(\d+) h")
FIND_MINUTE_PATTERN = re.compile(r"(\d+) m")
FIND_SERVINGS_PATTERN = re.compile(r"(\d+) serving")

def parseIngredientInfo(textString):
    """ Parses a string of ingredient information into components.

    If textString is not of proper format, will return None.
    Otherwise returns dict containing: quantity, units, description, ingredient
    """
    quantity = parseQuantity(textString)
    if quantity == None:
        return None

    ingredientText = re.sub("\(.*\)", "", textString.lower())
    ingredientText = re.search("([ \d/]+)([^\d/]+)", ingredientText).group(2)
    words = ingredientText.split(" ")

    unit = getIfIsUnit(words[0])
    if unit != "":
        words = words[1:]
    elif len(words) > 2:
        unit = getIfIsUnit(words[0] + ' ' + words[1])
        if unit != '':
            words = words[2:]


    descriptions, ingredient = parseDescriptions(" ".join(words))

    ingredientInfo = {
        "quantity": quantity,
        "unit": unit,
        "descriptions": descriptions,
        "ingredient": ingredient,
        "originaltext": textString,
    }
    return ingredientInfo

def parseDescriptions(textString):
    """ Separates a string into the main ingredient and descritptions. """
    textString = re.sub(" with.*", "", textString)
    textString = re.sub(" cut into.*", "", textString)
    textString = re.sub(r"[^A-Za-z -]", " ", textString)
    textString = cleanString(textString)

    mainWords, descriptions, currentWords = [], [], []
    for word in textString.split(" "):
        if word in wordlabels.DESCRIPTIVEADJS:
            descriptions.append(word)
        elif word not in wordlabels.STOPWORDS:
            currentWords.append(word)
            continue

        if (' '.join(currentWords) in wordlabels.STOPWORDS):
            currentWords = []

        if len(currentWords) > len(mainWords):
            mainWords = currentWords
            currentWords = []
    if len(currentWords) > len(mainWords):
        mainWords = currentWords

    return descriptions, " ".join(mainWords)


def getIfIsUnit(textString):
    """ Return the string matching the unit.

    Returns pluralized forms of units.
    Returns empty string if input string is not a unit.
    """
    if textString in wordlabels.MEASUREMENTUNITS:
        return textString
    elif textString + "s" in wordlabels.MEASUREMENTUNITS:
        return textString + "s"
    elif textString + "es" in wordlabels.MEASUREMENTUNITS:
        return textString + "es"
    return ""
    
def parseQuantity(textString):
    """ Parse quantity of the string and returns a float of the quantity. 
    
    Parse the integral and fractional parts of the string.
    Returns a float of the sum of the integral and fractional parts.
    Returns None if there are no quantities in the input string.
    """
    quantityString = re.search(FIND_QUANTITY_PATTERN, textString)
    if quantityString == None:
        return None
    quantityString = quantityString.group(0)
    wholeFractionSplit = str.split(quantityString, " ")
    return sum(map(convertStringToNum, wholeFractionSplit))

def convertStringToNum(s):
    """ Converts a string of an integer or a fraction to a float. """
    numDenom = str.split(s, "/")
    if len(numDenom) == 1:
        return float(numDenom[0])
    return float(numDenom[0]) / float(numDenom[1])

def parseTime(textString):
    """ Given a string of the format _ h _ m, return a dict of components. 
    
    Returns a dictionary with two keys: "hours", "minutes".
    """
    hourSearch = re.search(FIND_HOUR_PATTERN, textString)
    hour = 0
    if hourSearch != None:
        hour = int(hourSearch.group(1))
    
    minuteSearch = re.search(FIND_MINUTE_PATTERN, textString)
    minute = 0
    if minuteSearch != None:
        minute = int(minuteSearch.group(1))

    return hour, minute

def parseServings(textString):
    """ Parse string for the serving size and return as an integer. """
    servingsSearch = re.search(FIND_SERVINGS_PATTERN, textString)
    return int(servingsSearch.group(1))

def cleanString(textString):
    """" Remove trailing new line characters and extra whitespace. """
    textString = textString.replace("\n", "")
    textString = re.sub(r"\s\s+", " ", textString)
    return textString.strip()
