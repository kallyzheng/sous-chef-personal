import requests
import time, sys
import numpy as np
from bs4 import BeautifulSoup
import scraper
import json

import requests
from lxml.html import fromstring
from itertools import cycle

def get_proxies():
    url = 'https://free-proxy-list.net/'
    response = requests.get(url)
    parser = fromstring(response.text)
    proxies = []
    for i in parser.xpath('//tbody/tr')[:50]:
        if i.xpath('.//td[7][contains(text(),"yes")]'):
            #Grabbing IP and corresponding PORT
            proxy = ":".join([i.xpath('.//td[1]/text()')[0], i.xpath('.//td[2]/text()')[0]])
            proxies.append(proxy)
    print(proxies)
    return proxies

proxies = get_proxies()
proxy_idx = 0
htmlDocument = ''
for j in np.arange(0, 99999, 12):
    for i in range(220000 + j, 220000 + j + 12):
        url = "https://www.allrecipes.com/recipe/"+ str(i)
        proxy = proxies[proxy_idx]
        while(True):
            try:
                response = requests.get(url)
                # response = requests.get(url, proxies={"http": proxy, "https": proxy})
            except:
                proxy_idx += 1
                if proxy_idx >= len(proxies):
                    proxy_idx = 0
                    proxies = get_proxies()
                print("\tfinding new proxy")
                time.sleep(5)
                continue
            
            htmlDocument = BeautifulSoup(response.content, "html.parser")
            try:
                recipeInfo = scraper.scrapeWebsite(htmlDocument)
            except:
                print("weird file " + str(i))
                with open('weird_recipes/' + str(i) + '.html', 'w') as outfile:
                        outfile.write(htmlDocument.prettify())
                        outfile.close()
                break
            if recipeInfo == None:
                print("no recipe: " + str(i))
                break
            with open('recipes/' + str(i) + '.json', 'w') as outfile:
                json.dump(recipeInfo, outfile)
                outfile.close()
            print(proxy + " completed: "+ str(i))
            time.sleep(5)
            break
        time.sleep(3)
