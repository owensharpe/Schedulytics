"""
File: data_scrape_trace.py
Author: Owen Sharpe
Date: 9/29/24
Description: Scrapes necessary data from Northeastern's Trace Surveys
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
        browser = p.chromium.launch(headless=False, slow_mo=50)
        page = browser.new_page()
        page.goto(url)

        # fill in my username and password
        page.wait_for_selector('#i0116')
        page.fill('#i0116', 'sharpe.o@northeastern.edu')
        page.click('#idSIButton9')
        page.wait_for_selector('#i0118')
        page.fill('#i0118', 'TracyMcgrady21!')
        page.click('#idSIButton9')

        # do two-factor authentication and then click okay button
        page.wait_for_selector('#trust-browser-button')
        page.click('#trust-browser-button')

        # click a further button to get into student hub
        page.wait_for_selector('#idSIButton9[value="Yes"]')
        page.click('#idSIButton9[value="Yes"]')

        # get on the trace surveys link from student hub and open new tab
        print("Into the Student Hub!")
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

        # go term by term, and scrape each page of trace surveys
        for term in filtered_terms:
            print(f"On Term: {term.evaluate('(node) => node.textContent')}")
            term.click()
            
            # let surveys load
            time.sleep(3)

            # force reset to first page by directly clicking page 1 in the pagination
            try:
                # locate the page 1 button in pagination and click it
                first_page_button = content_frame.locator('ul.pagination li a:has-text("1")')
                if first_page_button.count() > 0:
                    first_page_button.click()
                    print("Successfully clicked on the first page.")
                    content_frame.wait_for_load_state('networkidle')
                else:
                    print("No page 1 button found, likely already on first page.")
            except Exception as e:
                print(f"Error resetting to first page: {e}")

            # while we still have surveys to scrape
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
                print(temp_links)

                # try to go to next page
                next_button = content_frame.locator('ul.pagination').locator('li.pagination-next:not(.disabled) a').nth(0)
                if next_button.count() > 0:
                    next_button.click()
                    page_count += 1
                    time.sleep(2)
                else:
                    print("No more pages left to scrape.\n")
                    break

        time.sleep(10000)
        browser.close()

    return 0


def get_survey_content(url):
    """
    :param url: the url for the trace survey
    :return: html content data
    """
    pass


if __name__ == '__main__':

    # call method
    access_trace_surveys('https://student.me.northeastern.edu/resources/')





