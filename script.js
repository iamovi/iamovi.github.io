    function showSection(sectionId) {
      const sections = document.querySelectorAll('.section');
      sections.forEach(section => {
        section.style.display = 'none'; // hide all sections
      });
      document.getElementById(sectionId).style.display = 'block'; // show selected
    }
    
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const closeBtn = document.querySelector('.close-btn');

function openImage(src) {
  modal.style.display = 'flex';
  modalImg.src = src;
}

closeBtn.onclick = () => {
  modal.style.display = 'none';
};

// close when clicking outside image
modal.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
};

