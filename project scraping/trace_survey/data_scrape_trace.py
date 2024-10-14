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
        time.sleep(5)
        trace_tab.wait_for_load_state('networkidle')
        trace_tab.click('li[class="dropdown"] > a[class="dropdown-toggle"]')

        # get into reports browser
        trace_tab.wait_for_timeout(2000)
        trace_tab.click('a[href="reportbrowser"]')

        # get into the selection iframe
        trace_tab.wait_for_selector('iframe#contentFrame')
        content_frame = page.frame(name="contentFrame")

        time.sleep(10000)
        browser.close()

    return 0


if __name__ == '__main__':

    # call func
    access_trace_surveys('https://student.me.northeastern.edu/resources/')





