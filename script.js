    function showSection(sectionId) {
      const sections = document.querySelectorAll('.section');
      sections.forEach(section => {
        section.style.display = 'none'; // hide all sections
      });
      document.getElementById(sectionId).style.display = 'block'; // show selected
    }