"""
File: data_scrape_trace.py
Author: Owen Sharpe
Date: 9/29/24
Description: Scrapes necessary trace_data_stores from Northeastern's Trace Surveys
"""

# import necessary libraries
from playwright.sync_api import sync_playwright, Playwright
import pandas as pd
from bs4 import BeautifulSoup
import requests
import time


def access_trace_surveys(url):
    """ Accesses the Northeastern Trace Surveys
    :param url: a given url
    :return: null
    """

    # access the given url
    with sync_playwright() as p:

        # go to the Northeastern page
        browser = p.chromium.launch(headless=True, slow_mo=50)
        context = browser.new_context()
        page = context.new_page()
        page.goto(url)

        # fill in my username and password (username and password hidden)
        page.wait_for_selector('#i0116')
        page.fill('#i0116', '')
        page.click('#idSIButton9')
        page.wait_for_selector('#i0118')
        page.fill('#i0118', '')
        page.click('#idSIButton9')

        # do two-factor authentication and then click okay button
        page.wait_for_selector('#trust-browser-button')
        page.click('#trust-browser-button')

        # click a further button to get into student hub
        page.wait_for_selector('#idSIButton9[value="Yes"]')
        page.click('#idSIButton9[value="Yes"]')

        # get on the trace surveys link from student hub and open new tab
        print("Into the Student Hub!")
        page.wait_for_selector('a[href="/resources/"]')
        page.click('a[href="/resources/"]')
        with page.expect_popup() as popup_info:
            page.click('a[href="https://www.applyweb.com/eval/shibboleth/neu/36892"]')
        trace_tab = popup_info.value
        trace_tab.wait_for_load_state()

        # do another login
        trace_tab.wait_for_selector('#username')
        trace_tab.fill('#username', 'sharpe.o')
        trace_tab.fill('#password', 'TracyMcgrady21!')
        trace_tab.click('button[name="_eventId_proceed"]')

        # do another duo authentication
        trace_tab.wait_for_selector('iframe#duo_iframe')
        iframe = trace_tab.frame(name="duo_iframe")
        iframe.locator('button:has-text("Send Me a Push")').click()

        # get into the dropdown menu
        print("Into the Trace Survey Browser!")
        time.sleep(5)
        trace_tab.wait_for_load_state('networkidle')
        trace_tab.click('li[class="dropdown"] > a[class="dropdown-toggle"]')

        # get into reports browser
        trace_tab.wait_for_timeout(2000)
        trace_tab.click('a[href="reportbrowser"]')

        # get into the content selection iframe
        trace_tab.wait_for_load_state('networkidle')
        trace_tab.wait_for_selector('iframe#contentFrame', timeout=3000)
        content_frame = trace_tab.frame(name='contentFrame')

        # get all the trace surveys terms
        select_element = content_frame.locator('select[id="TermSelect"]')
        options = select_element.locator('option')
        all_surveys = options.element_handles()

        # we need to filter out the law terms
        filtered_terms = []
        for survey in all_surveys[1:]:
            term_name = survey.evaluate('(node) => node.textContent')
            if 'LAW' not in term_name and 'Law' not in term_name and 'MLS' not in term_name:
                filtered_terms.append(survey)
        print(f"Filtered Out Law Terms!\n")


        # go term by term, and scrape each page of trace surveys (currently doing sixth section)
        data = []
        for term in filtered_terms[35:42]:
            print(f"On Term: {term.evaluate('(node) => node.textContent')}")
            term.click()

            # let surveys load
            time.sleep(2)

            try:
                # find the '1' page element
                page_1_locator = content_frame.locator(
                    'div.col-sm-12.hidden-xs li.pagination-page a:text-is("1")').first

                # check if '1' page exists
                page_1_count = page_1_locator.count()

                if page_1_count > 0:
                    # check if '1' page is active
                    parent_class = page_1_locator.locator('..').get_attribute("class")
                    if "active" in parent_class:
                        print("Page 1 is active, no further action needed.")
                    else:
                        print("Page 1 is visible but not active. Clicking to activate it.")
                        page_1_locator.click()
                        content_frame.wait_for_load_state('networkidle')
                        time.sleep(1)
                else:
                    # if page '1' is not found, click 'Previous' until we get to the first page
                    print("Going to click 'Previous' until we find the '1' tab.")
                    while True:
                        # Find the first "Previous" button within the 'hidden-xs' div
                        previous_button_li = content_frame.locator('div.col-sm-12.hidden-xs li.pagination-prev').filter(
                            has_text="Previous").first

                        # check if 'Previous' is disabled
                        if "disabled" in previous_button_li.get_attribute("class"):
                            print("Reached the start, but couldn't find page '1'.")
                            break

                        # click the "Previous" button to go back a page
                        previous_button_li.locator('a').click()
                        content_frame.wait_for_load_state('networkidle')
                        time.sleep(1)

                        # after clicking "Previous", check if '1' page is now visible
                        temp_pg1_locator = content_frame.locator(
                            'div.col-sm-12.hidden-xs li.pagination-page a:text-is("1")').first

                        # if we now see the '1' page
                        if temp_pg1_locator.count() > 0:
                            print("Page 1 is now visible. Clicking to activate it.")
                            temp_pg1_locator.click()
                            content_frame.wait_for_load_state('networkidle')
                            break
            except Exception as e:
                print(f"Error resetting pagination: {e}")

            # while we still have surveys to scrape
            time.sleep(2)
            page_count = 1
            while 1:
                print(f'At Page #{page_count}')
                content_frame.wait_for_load_state('networkidle')

                # obtain rows
                survey_table = content_frame.locator('table#resultTable')
                rows = survey_table.locator('tbody tr')

                # get the 'href' links from each row
                temp_links = ['https://www.applyweb.com' + row.query_selector_all('a')[0].get_attribute('href') for row
                                in rows.element_handles()]

                # get the trace_data_stores in each link
                for link in temp_links:
                    data.append(get_survey_content(context, link))

                # try to go to next page
                next_button = content_frame.locator('ul.pagination').locator('li.pagination-next:not(.disabled) a').nth(0)
                if next_button.count() > 0:
                    next_button.click()
                    page_count += 1
                    time.sleep(2)
                else:
                    print("No more pages left to scrape.\n")
                    break
        browser.close()
    return pd.DataFrame(data)


def get_survey_content(chr_context, url):
    """
    :param chr_context: the playwright context object to be able to open a new tab
    :param url: the url for the trace survey
    :return: html content trace_data_stores
    """

    # open a new tab for the survey url and go to the url
    new_tab = chr_context.new_page()
    new_tab.goto(url)

    # wait for the iframe to load
    new_tab.wait_for_selector('iframe#contentFrame', timeout=3000)

    # access iframe content by switching to the iframe context
    content_frame = new_tab.frame(name='contentFrame')

    # first get the course details
    course_details_selector = 'ul.list-unstyled'
    content_frame.wait_for_selector(course_details_selector, timeout=5000)
    course_details_element = content_frame.locator(course_details_selector)
    course_details = {}
    course_list_items = course_details_element.locator('li')
    for item in course_list_items.element_handles():

        # get the text content and split to get key-value pairs
        content = item.text_content()
        if ':' in content:
            key, value = content.split(':', 1)
            course_details[key.strip()] = value.strip().replace("<strong>", "").replace("</strong>", "")

    # initialize row
    row = {
        'Instructor': course_details.get("Instructor", "N/A"),
        'Course Title': course_details.get("Course Title", "N/A"),
        'Section': course_details.get("Section", "N/A"),
        'Course ID': course_details.get("Course ID", "N/A")
    }

    # locate the parent div containing all charts
    chart_container = content_frame.locator('#chart_55')

    # get all individual chart divs within this container
    chart_divs = chart_container.locator('div[id^="chart_"]')

    # iterate over each chart div to extract questions and values
    for i in range(chart_divs.count()):
        chart_div = chart_divs.nth(i)

        questions_selector = '[id^="bar_mean_55_"] > div > div:nth-child(1) > div > svg > g:nth-child(4) > g:nth-child(4)'
        ratings_selector = '[id^="bar_mean_55_"] > div > div:nth-child(1) > div > svg > g:nth-child(4) > g:nth-child(5)'

        # get the survey questions
        questions_element = chart_div.locator(questions_selector)
        question_groups = questions_element.locator('g')
        questions = []
        for i in range(6, question_groups.count()):
            question_g = question_groups.nth(i)
            question_text_element = question_g.locator('text').first
            question_text = question_text_element.text_content().strip()
            if question_text:
                questions.append(question_text)


        # get the survey ratings
        ratings_element = chart_div.locator(ratings_selector)
        rating_groups = ratings_element.locator('g')
        ratings = []
        for i in range(0, 6*len(questions), 3):
            rating_g = rating_groups.nth(i)
            rating_text_element = rating_g.locator('text').first
            rating_text = rating_text_element.text_content().strip()
            ratings.append(float(rating_text))

        # get professor and department means
        professor_means = ratings[:len(questions)]
        department_means = ratings[len(questions):]

        # match questions and ratings
        for i, question in enumerate(questions):
            rating_difference = round(professor_means[i] - department_means[i], 1)
            row[question] = rating_difference

    # exit out the tab
    new_tab.close()

    return row


if __name__ == '__main__':

    # call method
    df = access_trace_surveys('https://student.me.northeastern.edu/resources/')
    df.to_csv('trace_data_stores/Section 6 Trace Surveys.csv', index=False)
