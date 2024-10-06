"""
File: data_scrape_rmp.py
Author: Owen Sharpe
Date: 9/23/24
Description: Scrapes necessary data from Rate My Professor
"""

# import necessary libraries
import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import requests
import warnings
from ratemyprof_api import RateMyProfApi


# getting the html file using requests and returning a beautiful soup object
def requests_get_soup(url):
    """
    :param url: a url
    :return: html content
    """

    # get the html contents
    feed = requests.get(url)
    html = feed.text

    # turn into a beautiful soup object
    temp_soup = BeautifulSoup(html)

    return temp_soup


# scrape specific professor number of ratings and average rating at a specific university
def scrape_professor_avg_rating_and_num_ratings(prof_id):
    """
    :param prof_id: the professor id
    :return: average rating, number of ratings for a given professor
    """

    # temporary url
    prof_url = f"https://www.ratemyprofessors.com/professor/{prof_id}"

    # get soup object to parse it
    soup = requests_get_soup(prof_url)

    # find the number of ratings; if there are none specify 0
    num_of_ratings = soup.find('div', class_="RatingValue__NumRatings-qw8sqy-0 jMkisx").find(
        'a').get_text(strip=True)
    if num_of_ratings == 'Add a rating.':
        num_of_ratings = 0
    else:
        num_of_ratings = int(num_of_ratings.split('ratings')[0])

    # find the average rating; specify if it's N/A
    rating = soup.find('div', class_='RatingValue__Numerator-qw8sqy-2 liyUjw').get_text(strip=True)
    if rating != 'N/A':
        rating = float(rating)

    return num_of_ratings, rating


# scrape specific professor wta percentage and level of difficulty at a specific university
def scrape_professor_wta_percentage_and_lvl_of_difficulty(prof_id):
    """
    :param prof_id: the professor id
    :return: would take again percentage, level of difficulty for a given professor
    """

    # temporary url
    prof_url = f"https://www.ratemyprofessors.com/professor/{prof_id}"

    # get soup object to parse it
    soup = requests_get_soup(prof_url)

    # find the would you take again percentage and level of difficulty (if they exist)
    terms = soup.find('div',
                      class_='TeacherFeedback__StyledTeacherFeedback-gzhlj7-0 cxVUGc').findAll('div',
                      class_="FeedbackItem__FeedbackNumber-uof32n-1 kkESWs")
    percentage = terms[0].get_text(strip=True)
    if percentage != 'N/A':
        percentage = float(percentage[:-1]) / 100

    # check if they actually have a level of difficulty
    if len(terms) == 2:
        lvl = float(terms[1].get_text(strip=True))
    else:
        lvl = 'N/A'

    return percentage, lvl


def scrape_professor_tags(prof_id):
    """
    :param prof_id: the professor id
    :return: a list of tags for the given professor
    """

    # temporary url
    prof_url = f"https://www.ratemyprofessors.com/professor/{prof_id}"

    # get soup object to parse it
    soup = requests_get_soup(prof_url)

    # get the tags associated with the professor
    tags = []
    tags_soup = soup.find('div', class_='TeacherTags__TagsContainer-sc-16vmh1y-0 dbxJaW')

    # check if we actually have tags
    if tags_soup:

        # if we do, then get them
        teacher_tags = tags_soup.findAll(class_='Tag-bs9vf4-0 hHOVKF')
        for tag in teacher_tags:
            temp_statement = tag.get_text(strip=True)
            tags.append(temp_statement)

    return tags


def scrape_professor_reviews(universityobject, prof_id):
    """
    :param universityobject: the instantiated object for a specific university
    :param prof_id: the professor id
    :return: a list of reviews specific to the given professor
    """

    # grab the reviews list from the specific professor using the API
    reviews = universityobject.create_reviews_list(prof_id)

    # turn into a DataFrame object; check if we actually have reviews
    if reviews:
        temp_df = pd.DataFrame(reviews)

        # take only certain columns we want and rename them as such
        temp_df = temp_df[['attendance', 'clarityColor', 'easyColor', 'helpColor', 'onlineClass',
                           'quality', 'rClarity', 'rClass', 'rComments', 'rDate', 'rEasy', 'rHelpful',
                           'rOverall', 'rWouldTakeAgain', 'takenForCredit', 'teacherGrade',
                           'teacherRatingTags']]
        # temp_df.columns
        temp_df.columns = ['Attendance', 'Clarity (color)', 'Easy (color)', 'Help (color)', 'Online Class',
                           'Quality', 'Clarity (rating)', 'Class (rating)', 'Comments', 'Date', 'Easy Rating',
                           'Helpful Rating', 'Overall Rating', 'Would Take Again?', 'Taken for Credit?',
                           'Grade in Class', 'Teacher Rating Tags']
    else:
        temp_df = pd.DataFrame()

    return temp_df


if __name__ == '__main__':

    """
    # scrape professors from Northeastern
    NortheasternUniversity = RateMyProfApi('696')
    professor_data = NortheasternUniversity.get_professors()
    
    # get temporary professor data
    prof_df = pd.DataFrame(professor_data)
    
    # filter data we want to keep (for now)
    final_df = prof_df[['tFname', 'tMiddlename', 'tLname', 'tid', 'tDept', 'institution_name', 'tSid']]

    # change column names
    final_df.columns = ['First Name', 'Middle Name', 'Last Name', 'ID', 'Department',
                        'Institution Name', 'Institution ID']

    # Remove Leandra Smollin and Jack Witkin (They have no data)
    final_df = final_df[~final_df['ID'].isin([1047708, 2180974])]
    
    # get all the content we need
    final_df[['Number of Ratings', 'Average Rating (Out of 5)']] = final_df['ID'].apply(lambda x:
     pd.Series(data_scrape.scrape_professor_avg_rating_and_num_ratings(x)))

    final_df[['Would Take Again (Percent)', 'Level of Difficulty (Out of 5)']] = final_df['ID'].apply(lambda x:
     pd.Series(data_scrape.scrape_professor_wta_percentage_and_lvl_of_difficulty(x)))
    
    final_df['Popular Tags'] = final_df['ID'].apply(lambda x: data_scrape.scrape_professor_tags(x))
 
    final_df['Reviews'] = final_df['ID'].apply(lambda x:
     data_scrape.scrape_professor_reviews(NortheasternUniversity, x))
     
    # export our scraped RateMyProfessor Data as a CSV File
    final_df.to_csv('northeastern_rmp_data.csv')
    """
