import requests
import json
import sys
import os
from typing import List, Dict, Any

# Load API keys from environment or use defaults
API_KEY = os.getenv('GOOGLE_API_KEY', 'AIzaSyDKBRtpsnuqpMVuao5tMp65BxfVUJWZN58')
CSE_ID = os.getenv('GOOGLE_CSE_ID', 'c5d364eaef3874982')

def search_linkedin_profiles(keywords: List[str], num_results: int = 10) -> List[Dict[str, Any]]:
    """
    Search for LinkedIn profiles using Google Custom Search API
    
    Args:
        keywords: List of keywords to search for
        num_results: Number of results to return (max 10 per request)
    
    Returns:
        List of dictionaries containing profile information
    """
    # Combine keywords into a search query
    query = " ".join(keywords)
    
    search_url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": API_KEY,
        "cx": CSE_ID,
        "q": f"site:linkedin.com/in {query}",
        "num": min(num_results, 10)  # Google CSE API limit
    }

    try:
        response = requests.get(search_url, params=params)
        response.raise_for_status()
        results = response.json()

        if "items" not in results:
            return []

        profiles = []
        for item in results["items"]:
            # Extract profile information
            profile = {
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "displayLink": item.get("displayLink", ""),
                "formattedUrl": item.get("formattedUrl", "")
            }
            
            # Try to extract name from title (LinkedIn titles usually contain the person's name)
            title = profile["title"]
            if " | " in title:
                name = title.split(" | ")[0].strip()
            elif " - " in title:
                name = title.split(" - ")[0].strip()
            else:
                name = title.strip()
            
            profile["name"] = name
            profile["keywords_matched"] = keywords
            profiles.append(profile)

        return profiles

    except requests.RequestException as e:
        print(f"Error making request: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return []

def search_by_categories(skills: List[str] = None, industries: List[str] = None, 
                        companies: List[str] = None, certifications: List[str] = None,
                        job_titles: List[str] = None, num_results: int = 10) -> Dict[str, Any]:
    """
    Search LinkedIn profiles by different categories of keywords
    
    Returns:
        Dictionary containing search results and metadata
    """
    all_keywords = []
    search_categories = []
    
    if skills:
        all_keywords.extend(skills)
        search_categories.append(f"Skills: {', '.join(skills)}")
    
    if industries:
        all_keywords.extend(industries)
        search_categories.append(f"Industries: {', '.join(industries)}")
    
    if companies:
        all_keywords.extend(companies)
        search_categories.append(f"Companies: {', '.join(companies)}")
    
    if certifications:
        all_keywords.extend(certifications)
        search_categories.append(f"Certifications: {', '.join(certifications)}")
    
    if job_titles:
        all_keywords.extend(job_titles)
        search_categories.append(f"Job Titles: {', '.join(job_titles)}")
    
    if not all_keywords:
        return {
            "profiles": [],
            "search_query": "",
            "categories": [],
            "total_results": 0,
            "error": "No search keywords provided"
        }
    
    profiles = search_linkedin_profiles(all_keywords, num_results)
    
    return {
        "profiles": profiles,
        "search_query": " ".join(all_keywords),
        "categories": search_categories,
        "total_results": len(profiles),
        "error": None
    }

def main():
    """Command line interface for the LinkedIn search script"""
    if len(sys.argv) < 2:
        print("Usage: python linkedin_search.py <keywords...>")
        print("Example: python linkedin_search.py 'software engineer' 'python' 'machine learning'")
        sys.exit(1)
    
    # Get keywords from command line arguments
    keywords = sys.argv[1:]
    
    # Search for profiles
    profiles = search_linkedin_profiles(keywords)
    
    # Output results as JSON
    result = {
        "profiles": profiles,
        "search_query": " ".join(keywords),
        "total_results": len(profiles)
    }
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
